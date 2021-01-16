var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('express')
var objectId = require('mongodb').ObjectID
const Razorpay=require('razorpay')
const { promises } = require('fs')
const { resolve } = require('path')
var instance = new Razorpay({
    key_id: 'rzp_test_9CMv5bZf2zsCP0',
    key_secret: 'MhliUemSD5Q9NPJzCryhYWC8',
  });
module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.ops[0])
            })

        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        console.log('Login success')
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log("Login failed")
                        resolve({ status: false })
                    }
                })
            } else {
                console.log("Login Failed")
                resolve({ status: false })
            }
        })
    },
    addToCart: (productId,userId) => {
        let productObj = {
            item: objectId(productId),
            quantity:1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION)
                .findOne({user:objectId(userId)})
            if (userCart) {
                let productExist = userCart.products.findIndex(product=>product.item==productId)
                if (productExist!=-1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({user:objectId(userId),'products.item':objectId(productId)},
                            {
                                $inc:{'products.$.quantity':1}
                            }
                        ).then(()=>{
                            resolve()
                        })
                }else{
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({user:objectId(userId)},
                            {

                                $push: {products:productObj}


                            }
                        ).then((response)=>{
                            resolve()
                        })
                }
            }else{
                let cartObj ={
                    user: objectId(userId),
                    products: [productObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{

                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {user:objectId(userId)}
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as: 'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }

            ]).toArray()
            console.log('getcartProduct()');
            console.log(cartItems);
            resolve(cartItems)

        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION)
            .findOne({user:objectId(userId)})
            if (cart){
                count = cart.products.length
            }
            resolve(count)
        })

    },
    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:objectId(details.cart)},
                {
                    $pull:{products:{item:objectId(details.product)}}
                }
                ).then((response)=>{
                    resolve({removeProduct:true})
                })
            }else{
            db.get().collection(collection.CART_COLLECTION)
            .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                {
                    $inc:{'products.$.quantity':details.count}
                }
            ).then((response)=>{
                resolve({status:true})
            })
            }
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: 
                    {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: 
                    {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:
                    {
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },

                {
                    $group:
                    {
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$product.Price']}}
                    }
                }

            ]).toArray()
            console.log(total[0].total);
            resolve(total[0].total)

        })
    },

    placeOrder:(placeOrder,products,total)=>{
        return new Promise((resolve,reject)=>{
            let status=placeOrder['payment-method']==='COD'?'placed':'pending'
            let orderObject={
                deliveryDetails:{
                    mobile:placeOrder.mobile,
                    address:placeOrder.address,
                    pincode:placeOrder.pincode
                },
                userId:objectId(placeOrder.userId),
                paymentMethod:placeOrder['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date
                
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObject).
            then((response)=>{
                db.get().collection(collection.CART_COLLECTION).removeOne({user:objectId(placeOrder.userId)})
                console.log(orderObject);
                resolve(response.ops[0]._id)
            })
        })

    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION)
            .findOne({user:objectId(userId)})
            resolve(cart.products)
        })
    },
    getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION)
            .find({userId:objectId(userId)}).
            toArray()
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {_id: objectId(orderId)}
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },


            ]).toArray()
            resolve(orderItems)
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                  if(err){
                      console.log(err);
                  }else{
                    resolve(order)
                  }

              });
            
        })
    },
    verifyPayment:(details)=>{
        console.log('start');
        console.log(details);
        console.log(details['payment[razorpay_order_id]'])
        return new Promise((resolve,reject)=>{

        const crypto = require('crypto');

        const secret = 'MhliUemSD5Q9NPJzCryhYWC8';
        let hash = crypto.createHmac('sha256', secret)
                        .update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]'])
                        .digest('hex');
        console.log(hash);
        if(hash==details['payment[razorpay_signature]']){
            resolve()
          }else{
            reject() 
          }

        })
    },

     changePaymentStatus:(orderId)=>{
        console.log(orderId);
         return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION)
            .updateOne({_id:objectId(orderId)},
             {
                 $set:{
                     status:'placed'
                }
             }
             ).then(()=>{
                 resolve()
             })

         })
    }

}