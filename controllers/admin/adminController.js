const User = require('../../model/userSchema');
const Product  = require('../../model/productSchema');
const Order  = require('../../model/orderSchema');
const {getDashboardData,getLedgerBook} = require('../../helpers/dashboardHelper');
const {generateLedgerPDF} = require('../../helpers/Ledger-Book Format/PDF_Format')
const {generateLedgerExcel} = require('../../helpers/Ledger-Book Format/Excel_Format')
const {generateLedgerCSV} = require('../../helpers/Ledger-Book Format/CSV_Format')
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const e = require('express');


//load signin page
const loadSignin = (req,res)=>{

    if(req.session.admin){
        return res.redirect('/admin')
    }

    res.render('adminSignin',{message:null})

}

//signin method
const signin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });
        console.log('admin signIn')


        if (admin) {
            
            const passwordMatch = await bcrypt.compare(password, admin.password);

            if (passwordMatch) {
                req.session.admin = admin;
                return res.status(200).json({ success: true, message: 'Login successful' });
            } else {
                return res.status(401).json({ success: false, message: 'Incorrect password' });
            }
        } else {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

    } catch (error) {
        console.log('login error', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}


//load dashboard
const loadDashboard = async (req, res) => {
  try {
    const filter = req.query.filter || "monthly";

    const { revenueData, bestProducts, bestCategories } = await getDashboardData(filter);

    // Other data
    const recentOrders = await Order.find({})
      .sort({ createdOn: -1 })
      .limit(10)
      .populate("user", "name email")
      .populate("orderitems.product", "productName images");

    const totalUsers = await User.countDocuments();

    res.render("dashboard", {
      filter,
      revenueData,
      bestProducts,
      bestCategories,
      recentOrders,
      totalUsers
    });
  } catch (error) {
    console.log(error);
    res.redirect("pageerror");
  }
};

// for fetching filtered data
const getDashboardStats = async (req, res) => {
  try {
    const filter = req.query.filter || "yearly";
    const { revenueData, bestProducts, bestCategories } = await getDashboardData(filter);
    res.json({ revenueData, bestProducts, bestCategories });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
};

const downloadLedger = async (req, res) => {
  try {
    const { filter = "yearly", format = "pdf" } = req.body;

    const ledgerData = await getLedgerBook(filter);
    
    switch (format.toLowerCase()) {
      case "pdf":
        return generateLedgerPDF(ledgerData, filter, res);
      case "excel":
        return generateLedgerExcel(ledgerData, filter, res);
      case "csv":
        return generateLedgerCSV(ledgerData, filter, res);
      default:
        return res.status(400).json({ error: "Invalid format requested" });
    }

  } catch (error) {
    console.error("Ledger download error:", error);
    res.status(500).send("Server Error");
  }
};

const loadForgotPassword = async (req,res)=>{
    const { email } = req.body;
    // Check if admin exists, generate and send OTP, then respond
    res.json({ success: true });
}


const logout = async (req,res)=>{
    try {
        
        req.session.destroy(err=>{
            if(err){
                console.log('Error destroying session',err);
                return res.redirect('/pageerror');
            }
            res.redirect('/admin/signin')
        })


    } catch (error) {
        
        console.log(('unexpected error during logout',error));
        res.redirect('/pageerror')
    }
}



module.exports = {
    loadSignin,
    signin,
    loadDashboard,
    getDashboardStats,
    downloadLedger,
    loadForgotPassword,
    logout
}