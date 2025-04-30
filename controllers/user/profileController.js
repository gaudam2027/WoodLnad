const User = require('../../model/userSchema');
const nodemailer =  require('nodemailer');
const env = require('dotenv').config();
const bcrypt = require("bcrypt");

// otp generate function
function generateOTP(){
    const digit = "1234567890"
    let otp = ""
    for(let i=0;i<6;i++){
        otp+=digit[Math.floor(Math.random()*10)]
    }
    return otp
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

        const mailOptions = {
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP ${otp}<br><h4></b>`,

        }

        const info = await transporter.sendMail(mailOptions);
        console.log("Email send:",info.messageId);

        return true;

    } catch (error) {
        
        console.error('Error sending email',error)
        return false;

    }
}

// password hash function
const securePassword = async (password)=>{
    try {
        const PasswordHash = await bcrypt.hash(password,10)
        return PasswordHash
    } catch (error) {
        console.log('error while password hashing...',error);
    }
}

const loadForgotPassword = async(req,res)=>{
    try {
        
        res.render("forgot-password")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const forgotEmailValid = async(req,res)=>{
    try {
        
        const {email} = req.body
        const findUser = await User.findOne({email,isAdmin:false});

        if(findUser){
            const otp = generateOTP()
            console.log(otp)
            const emailSend = await sendVerificationEmail(email,otp);

            if(emailSend){
                req.session.userOTP = otp;
                req.session.email = email;
                res.status(200).json({ success: true, redirect: "/forgotPass-OTP" });
            }else{
                return res.status(500).json({ success: false, message: "Failed to send email. Try again later." });
            }
        }else{
            return res.status(404).json({ success: false, message: "User not found with this email" });
        }

        
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}

const loadForgotPassOTP = async(req,res)=>{
    try {

        
        res.render("forgotPass-OTP")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const verifyForgotPasssOTP = async(req,res)=>{
    try {
        console.log('reached');
        const enteredOTP =req.body.otp

        if(enteredOTP==req.session.userOTP){
            res.status(200).json({ success: true, redirect: "/reset-password" });
        }else{
            res.status(404).json({ success: false, message: "OTP not matching..." });
        }
        
    } catch (error) {
        res.status(500).json({ success: false, message: "An error occured.. please try again"});
        res.redirect('/pageNotFound')
    }
}

const resendforgotPasssOTP = async(req,res)=>{
    try {
        const otp = generateOTP();
        req.session.userOTP = otp;
        const email = req.session.email;

        console.log('Resending OTP to email:',email);
        const emailSend = await sendVerificationEmail(email,otp);
        if(emailSend){
            console.log("Resend OTP:",otp);
            res.status(200).json({success:true,message:"Resent OTP successfull"});
        }
        
        
    } catch (error) {
        console.log('Error in resending OTP',error);
        
        res.status(500).json({ success: false, message: "Internal server error"});
    }
}



const loadResetPassword = async(req,res)=>{
    try {
        console.log('reset');
        
        
        res.render("reset-password")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const resetPassword = async(req,res)=>{
    try {
        console.log('resetPost');
        const {password} =req.body;
        const email = req.session.email
        console.log(password);
        console.log(email);
        
        const PasswordHash = await securePassword(password);
        await User.updateOne(
            {email:email},
            {$set:{password:PasswordHash}}
        )
        res.status(200).json({success:true,redirect:"/signin"});
        
        
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}



module.exports = {
    loadForgotPassword,
    forgotEmailValid,
    loadForgotPassOTP,
    verifyForgotPasssOTP,
    resendforgotPasssOTP,
    loadResetPassword,
    resetPassword
}