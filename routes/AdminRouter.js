const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const productController = require('../controllers/admin/productController')
const {uploads} = require('../middleware/multerConfig');
const {userAuth,adminAuth} = require('../middleware/auth')

//login management
router.get('/signin',adminController.loadSignin)
router.post('/signin',adminController.signin)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

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



module.exports = router;