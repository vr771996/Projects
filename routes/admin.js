var express = require('express');
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
var router = express.Router();
var productHelper=require('../helpers/product-helpers')


/* GET users listing. */
router.get('/', function(req, res, next) {
productHelpers.getAllProducts().then((products)=>{
  res.render('admin/view-products',{admin:true,products})

})
  
});
router.get('/add-product',function(req,res){
  res.render('admin/add-product')
})

router.post('/add-product',(req,res)=>{
  productHelpers.addProduct(req.body,(id)=>{
    let image=req.files.Image
    image.mv('./public/product-images/'+id+'.jpg',(err)=>{
      if(!err){
        res.render("admin/add-product")
      }
      else{
        console.log(err);
      }
    })
    res.render("admin/add-product")

  })
})
router.get('/delete-products/:id',(req,res)=>{
  let productId=req.params.id
  console.log(productId);
  productHelpers.deleteProduct(productId).then((response)=>{
    res.redirect('/admin/')
  })
 
})
router.get('/edit-products/:id',async (req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-products',{product})
})
router.post('/edit-products/:id',(req,res)=>{
  let id=req.params.id
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let image=req.files.Image
      image.mv('./public/product-images/'+id+'.jpg')

    }
  })
})
router.get('/view-all-orders',async(req,res)=>{
  let products=await userHelpers.getOrderProducts('5f9a8273576f931904e1df99',)
  console.log(products);
  res.render('admin/view-all-orders',{admin:true,products})
})

module.exports = router; 
