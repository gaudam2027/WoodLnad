const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const couponController = require('../controllers/admin/couponController')
const orderController = require('../controllers/admin/orderController')
const {uploads} = require('../middleware/multerConfig');
const {userAuth,adminAuth} = require('../middleware/auth')

//login management
router.get('/signin',adminController.loadSignin)
router.post('/signin',adminController.signin)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

//Forgot Password Management
router.post('/forgot-password',adminController.loadForgotPassword)

//customer management
router.get('/users',adminAuth,customerController.customerInfo);
router.post('/users-block',adminAuth,customerController.customerBlock)


//category management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer);
router.post('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer);
router.post('/category-list',adminAuth,categoryController.categoryList);
router.post('/updateCategory',adminAuth,categoryController.updateCategory);

//product management
router.get('/Products',adminAuth,productController.productsPage);
router.get('/addProduct',adminAuth,productController.productAddPage);
router.post('/addProduct',adminAuth,uploads.array("images",4),productController.addProducts);
router.get('/editProduct',adminAuth,productController.productEditPage);
router.post('/editProduct/:id',adminAuth,uploads.array("images",4),productController.editProduct);
router.post('/deleteSingleImage',adminAuth,productController.deleteSingleImage);
router.post('/product-block',adminAuth,productController.productBlock)

//Coupon Mangement
router.get('/coupons',adminAuth,couponController.couponsPage);
router.post('/coupons',adminAuth,couponController.addCoupons);
router.put('/coupons/:id',adminAuth, couponController.editCoupons);
router.patch('/coupons',adminAuth, couponController.listCoupons);

//Order Management
router.get('/order',orderController.manageOrder);
router.put('/order-statusUpdate',orderController.statusUpdate);
router.post('/orders/verify-return',orderController.verifyReturn);
router.get('/order/:id',orderController.orderDetials);


module.exports = router;