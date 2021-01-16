$(document).ready(function(){
    $("#signup-form").validate({
        rules:{
            fname:{
                required:true,
                minlength:4
            },
            sname:{
                required:true,
                minlength:4
            },
            emailaddress:{
                required:true,
                email:true
            },
            password:{
                required:true,
                minlength:4
            },
            day:{
                required:true
            },
            gender:{
                required:true
            }

        },
        messages:{
            fname:{
            required:'Enter firstname',
            minlength:'Enter atleast 4 characters'
        }

        }
    })
})