const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const couponController = require('../controllers/admin/couponController')
const orderController = require('../controllers/admin/orderController')
const offerController = require('../controllers/admin/offerController')
const {uploads} = require('../middleware/multerConfig');
const {userAuth,adminAuth} = require('../middleware/auth')
const salesReport = require('../controllers/admin/salesReportController')

//DashBoard management
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/dashboard/stats',adminAuth,adminController.getDashboardStats)
router.post('/dashboard/generate-ledger',adminController.downloadLedger)

//login management
router.get('/signin',adminController.loadSignin)
router.post('/signin',adminController.signin)
router.get('/logout',adminController.logout)

//Forgot Password Management
router.post('/forgot-password',adminController.loadForgotPassword)

//customer management
router.get('/users',adminAuth,customerController.customerInfo);
router.post('/users-block',adminAuth,customerController.customerBlock)


//category management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);
router.post('/editCategory',adminAuth,categoryController.updateCategory);
router.post('/category-list',adminAuth,categoryController.categoryList);

//product management
router.get('/Products',adminAuth,productController.productsPage);
router.get('/addProduct',adminAuth,productController.productAddPage);
router.post('/addProduct',adminAuth,uploads.array("images",4),productController.addProducts);
router.get('/editProduct',adminAuth,productController.productEditPage);
router.post('/editProduct/:id',uploads.array("images",4),productController.editProduct);
router.post('/deleteSingleImage',productController.deleteSingleImage);
router.post('/product-block',adminAuth,productController.productBlock)

//Coupon Mangement
router.get('/coupons',adminAuth,couponController.couponsPage);
router.get('/coupons/search',adminAuth, couponController.fetchCoupons);
router.post('/coupons',adminAuth,couponController.addCoupons);
router.put('/coupons/:id',adminAuth, couponController.editCoupons);
router.patch('/coupons',adminAuth, couponController.listCoupons);

//Order Management
router.get('/order',adminAuth,orderController.manageOrder);
router.put('/order-statusUpdate',orderController.statusUpdate);
router.post('/orders/verify-return',orderController.verifyReturn);
router.get('/order/:id',adminAuth,orderController.orderDetials);

//offer management
router.get('/offers',adminAuth,offerController.getOffers)
router.get('/api/offers',adminAuth,offerController.getOffersApi)
router.post('/offers',offerController.addOffer)
router.put('/offers/:id',offerController.editOffer)
router.patch('/offers/:id',offerController.toggleOfferStatus)
router.delete('/offers/:id',offerController.deleteOffer)

//sales Report Management
router.get('/salesReport',adminAuth, salesReport.loadSalesReport);
router.get('/api/sales-report',adminAuth, salesReport.generateSalesReport);
router.get('/api/sales-report/export',adminAuth, salesReport.exportSalesReport);


module.exports = router;