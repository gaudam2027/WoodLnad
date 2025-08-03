const User = require('../../model/userSchema');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');



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
const loadDashboard = async (req,res)=>{
    try {
        console.log('here');
        
        res.render('dashboard')

    } catch (error) {
        res.redirect('pageerror')
    }

}

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
    loadForgotPassword,
    logout
}