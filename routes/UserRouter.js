const express =  require('express');
const router = express.Router();

//controllers
const userController = require('../controllers/user/userController');
const infoController = require('../controllers/user/infoController');
const profileController = require('../controllers/user/profileController')
const addressController = require('../controllers/user/AddressController')
const wishlistController = require('../controllers/user/wishlistController')
const walletController = require('../controllers/user/walletController')
const cartController = require('../controllers/user/cartController')
const checkoutController = require('../controllers/user/checkoutController')
const orderController = require('../controllers/user/orderController')
const invoiceController = require('../controllers/user/invoiceController')

const passport = require('passport');
const {uploads,profileUpload} = require('../middleware/multerConfig');
const {userAuth,userIslog,checkUserStatus} = require('../middleware/auth')

//page not foun(for error)
router.get('/pageNotFound',userController.pageNotFound);

//signup management
router.get('/signUp',userIslog,userController.loadSignuppage);
router.post('/signUp',userController.signup);
router.get('/signupOtp',userIslog,userController.loadOtp);
router.post('/signupOtp',userIslog,userController.otp);
router.post('/resendOtp',userIslog,userController.resendOtp);
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signUp'}),userAuth,(req,res)=>{
    res.redirect('/')
});

//login management
router.get('/signIn',userIslog,userController.loadSigninpage);
router.post('/signIn',userController.signin);

//home page & shopping page
router.get('/',checkUserStatus,userController.loadHomepage);
router.get('/shop',checkUserStatus,userController.loadShoppage);
router.get('/filter',userController.filterProduct);
router.get('/shopDetails',checkUserStatus,userController.shopDetails);
router.post('/review',checkUserStatus,userController.submitReview);

//About us & contact us page
router.get('/aboutus',checkUserStatus,infoController.aboutUs);
router.get('/contactUs',checkUserStatus,infoController.contactUs);
router.post('/contact', checkUserStatus,infoController.postContactForm);


//profile management
router.get('/forgot-password',profileController.loadForgotPassword);
router.post('/forgot-password',profileController.forgotEmailValid);
router.get('/forgotPass-OTP',profileController.loadForgotPassOTP);
router.post('/verifyForgotPasss-OTP',profileController.verifyForgotPasssOTP);
router.post('/resendforgotPass-Otp',profileController.resendforgotPasssOTP);
router.get('/reset-password',profileController.loadResetPassword);
router.post('/reset-password',profileController.resetPassword);
router.get('/profile',userAuth,profileController.loadProfilepage);
router.post('/editProfile',profileUpload.single('profileImage'),profileController.editProfile);
router.post('/changeEmail',profileController.changeEmail);
router.post('/verifyEmail-OTP',profileController.verifyChangeEmail);
router.patch('/changePassword', userAuth, profileController.changePassword);
router.post('/resend-password-otp', userAuth, profileController.resendOtp);
router.post('/verifyPassword-OTP', userAuth, profileController.verifyPasswordOtp);


//address management
router.get('/address',addressController.manageAddress);
router.post('/address',addressController.addAddress);
router.put('/address',addressController.editAddress);
router.delete('/address/:id',addressController.deleteAddress);

//Wishlist Management
router.get('/wishlist',wishlistController.managewishlist);
router.post('/wishlist',wishlistController.addToWishlist);
router.delete('/wishlist',wishlistController.removeFromWishlist);

//wallet
router.get('/wallet',userAuth,walletController.manageWallet);
router.post('/wallet',userAuth,walletController.addMoney)
router.post('/verify-walletPayment',userAuth,walletController.verifyWalletPayment )


//Cart Management
router.get('/cart',userAuth,cartController.managecart);
router.post('/cart/:id',cartController.addCart);
router.patch('/cart/:id',userAuth,cartController.updateCartQuantity);
router.delete('/cart/:id',userAuth,cartController.deleteCartItem);

//Checkout management
router.get('/checkout',userAuth,checkoutController.loadCheckoutPage)
router.post('/checkout',checkoutController.checkoutHandler)
router.post('/verify-payment',checkoutController.verifyPayment)



//order management
router.get('/order-success',userAuth,orderController.loadOrderSuccess);
router.get('/order-failure',userAuth,orderController.loadOrderFailure);
router.post('/retry-payment', orderController.retryPaymentVerify);
router.get('/order',userAuth,orderController.loadOrderpage);
router.get('/order-details/:id',userAuth, orderController.orderDetails);
// router.post('/order/:id', orderController.cancelOrReturnOrderItem);
router.post('/orders/action', orderController.handleOrderOrItemAction);

//Invoice management
router.get('/invoice/full/:orderId', invoiceController.getFullInvoice);
router.get('/invoice/full/download/:orderId', invoiceController.downloadFullInvoice);
//Item invoice
router.get('/invoice/item/:orderId/:itemId', invoiceController.getItemInvoice);
router.get('/invoice/item/download/:orderId/:itemId', invoiceController.downloadItemInvoice);
//Email invoice
router.post('/invoice/email',invoiceController.emailInvoice)


router.get('/logout',userController.logout)




module.exports = router