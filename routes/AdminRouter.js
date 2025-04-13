const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController')
const customerController = require('../controllers/admin/customerController')
const categoryController = require('../controllers/admin/categoryController')
const {userAuth,adminAuth} = require('../middleware/auth')

//login management
router.get('/signin',adminController.loadSignin)
router.post('/signin',adminController.signin)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

//customer management
router.get('/users',adminAuth,customerController.customerInfo);
router.get('/blockCustomer',adminAuth,customerController.cutomerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.cutomerUnblocked)

//category management
router.get('/category',adminAuth,categoryController.categoryInfo);
router.post('/addCategory',adminAuth,categoryController.addCategory);

module.exports = router;