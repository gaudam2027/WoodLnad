const express =  require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require('passport');
const {userAuth,adminAuth} = require('../middleware/auth')

//page not foun(for error)
router.get('/pageNotFound',userController.pageNotFound);

//signup management
router.get('/signUp',userController.loadSignuppage);
router.post('/signUp',userController.signup);
router.get('/signupOtp',userController.loadOtp);
router.post('/signupOtp',userController.otp);
router.post('/resendOtp',userController.resendOtp);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signUp'}),(req,res)=>{
    res.redirect('/')
});

//login management
router.get('/signIn',userController.loadSigninpage);
router.post('/signIn',userController.signin);

//home page & shopping page
router.get('/',userController.loadHomepage);

router.get('/profile',userController.loadProfilepage);
router.get('/order',userController.loadOrderpage);
router.get('/logout',userController.logout)




module.exports = router