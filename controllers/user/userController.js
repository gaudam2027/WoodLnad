const User = require('../../model/userSchema');
const nodemailer =  require('nodemailer')
const env = require('dotenv').config();
const bcrypt = require("bcrypt");
const { response } = require('express');

//loading error page
const pageNotFound = async (req,res)=>{
    try {
        
        res.render('page-404')
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}




const loadHomepage = async (req,res)=>{
    try {
        const sessionUser = req.session.userData || req.session.user
        const passportUser = req.user;

        const user = sessionUser || passportUser;
        // console.log('User in home:', user);
        console.log(user);
        return res.render('home', { user });
    } catch (error) {
        console.log('Home page not found');
        res.status(500).send('Server error')
        
    }
}


const loadSignuppage = async (req,res)=>{
    try {
        
        return res.render('signUp');
    } catch (error) {
        console.log('Home page not found');
        res.status(500).send('Server error')
        
    }
}

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationEmail(email,otp){
    try {
        
        const transporter = nodemailer.createTransport({

            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"verify yor account",
            text:`Your OTP is ${otp}`,
            html:`<b>Your OTP ${otp}</b>`,

        })

        return info.accepted.length > 0

    } catch (error) {
        
        console.error('Error sending email',error)
        return false;

    }
}

const signup = async (req, res) => {
    console.log('reached');
    
    try {
        const { name, phone, email, password } = req.body;

        const findUser = await User.findOne({ email });

        if (findUser) {
            return res.json({
                success: false,
                message: 'User already exists with this email',
            });
        }

        const otp = generateOtp();

        const emailSend = await sendVerificationEmail(email, otp);

        if (!emailSend) {
            return res.json({
                success: false,
                message: 'Failed to send verification email',
            });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };

        
        console.log("OTP sent", otp);

       
        res.json({
            success: true,
            redirectUrl: '/signupOtp', 
        });


    } catch (error) {
        console.log('Signup error', error);
        res.json({
            success: false,
            message: 'Something went wrong. Please try again later.',
        });
    }
};



// securing the password (Hashing password function)
const securePassword = async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    } catch (error) {
        
    }    
}

// OTP validating
const otp = async (req,res)=>{
    try {
        
        const {otp} = req.body
        console.log(otp);
        console.log(req.session.userData);
        console.log('end');
        
        
        
        if(otp===req.session.userOtp){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash
            })

            // saving user in user collection
            await saveUserData.save();
            req.session.user = saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Inavaild OTP please try again"})
        }
    } catch (error) {
        
        console.error("Error verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
        
    }
}

const resendOtp = async (req,res)=>{
    console.log("reached");
    try {
        
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp()
        req.session.userOtp = otp;
        

        // console.log(req.session.otp)
        const emailSend = await sendVerificationEmail(email,otp);

        if(emailSend){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"OTP Resend Successfully"})
        }else{
            res.status(500).json({success:false,message:"Failed to resend OTP. Please try again"});
        }

    } catch (error) {
        console.error("Error resend OTP",error);
        res.status(500).json({success:false,message:"Internal Server Error, Please try again"})
    }
}


const loadOtp = async (req,res)=>{
    try {
        
        return res.render('otp');
    } catch (error) {
        console.log('otp-verification page not found');
        res.status(500).send('Server error')
        
    }
}

const loadSigninpage = async (req,res)=>{
    try {
        
        return res.render('signIn');
    } catch (error) {
        console.log('Home page not found');
        res.status(500).send('Server error')
        
    }
}

const signin= async (req,res)=>{
    try {
        
        const {email,password} = req.body;
        console.log('sign in reached');
        
        const findUser = await User.findOne({isAdmin:0,email:email});
        console.log(findUser)
        if(!findUser){
            return res.json({success: false,message: 'User not found'});
        }
        if(findUser.isBlocked){
            return res.json({success: false,message: 'User is blocked by admin'});
        }

        if (!findUser.password) {
            return res.json({ success: false, message: 'Please sign in using Google' });
          }          

        const passwordMatch = await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.json({success: false,message: 'Incorrect password'});
        }

        req.session.user = findUser._id;
        res.json({success: true,redirectUrl: '/'});

    } catch (error) {
        
        console.error("login error",error);
        res.status(500).json({success:false,message:"An error occured"})
        
    }
}


const loadProfilepage = async (req,res)=>{
    try {
        
        const sessionUser = req.session.userData;
        const passportUser = req.user;

        const user = sessionUser || passportUser;
        
        res.render('profile',{user});
    } catch (error) {
        console.log('Profile page not found');
        res.status(500).send('Server error')
        
    }
}

const loadOrderpage = async (req,res)=>{
    try {
        
        res.render('myOrders');
    } catch (error) {
        console.log('Order page not found');
        res.status(500).send('Server error')
        
    }
}


const logout = async (req,res)=>{
    try {
        
        req.session.destroy((err)=>{
            if(err){
                console.log('Session destruction error',err.message);
                return res.redirect('/pageNotFound');
            }
            return res.redirect('/signIn')
        })
    } catch (error) {

        console.log('Logout error',error);
        res.redirect('/pageNotFound')
        
    }
}


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignuppage,
    signup,
    loadOtp,
    otp,
    resendOtp,
    loadSigninpage,
    signin,
    loadProfilepage,
    loadOrderpage,
    logout
}