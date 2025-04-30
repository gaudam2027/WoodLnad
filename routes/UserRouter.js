const express =  require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/profileController')
const passport = require('passport');
const {userAuth,userIslog,adminAuth} = require('../middleware/auth')

//page not foun(for error)
router.get('/pageNotFound',userController.pageNotFound);

//signup management
router.get('/signUp',userController.loadSignuppage);
router.post('/signUp',userController.signup);
router.get('/signupOtp',userController.loadOtp);
router.post('/signupOtp',userController.otp);
router.post('/resendOtp',userController.resendOtp);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signUp'}),userAuth,(req,res)=>{
    res.redirect('/')
});

//login management
router.get('/signIn',userIslog,userController.loadSigninpage);
router.post('/signIn',userController.signin);

//home page & shopping page
router.get('/',userController.loadHomepage);
router.get('/shop',userController.loadShoppage);
router.post('/filter',userController.filterProduct);
router.get('/shopDetails',userController.shopDetails);

//profile management
router.get('/forgot-password',productController.loadForgotPassword);
router.post('/forgot-password',productController.forgotEmailValid);
router.get('/forgotPass-OTP',productController.loadForgotPassOTP);
router.post('/verifyForgotPasss-OTP',productController.verifyForgotPasssOTP);
router.post('/resendforgotPass-Otp',productController.resendforgotPasssOTP);
router.get('/reset-password',productController.loadResetPassword);
router.post('/reset-password',productController.resetPassword);
router.get('/profile',userController.loadProfilepage);
router.get('/order',userController.loadOrderpage);
router.get('/logout',userController.logout)




module.exports = router