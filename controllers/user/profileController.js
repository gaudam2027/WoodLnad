const User = require('../../model/userSchema');
const nodemailer =  require('nodemailer');
const { validateDOB } = require('../../helpers/validators/validateDOB');
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
            const otp = generateOTP()   // otp created
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

const loadForgotPassOTP = async(req,res)=>{
    try {
        if(req.session.email){
            res.render("forgotPass-OTP")
        }else{
            res.redirect("/signIn")
        }
        
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
        req.session.email = null
        console.log(password);
        console.log('your email',email);
        
        const PasswordHash = await securePassword(password);
        if(email){
            await User.updateOne(
                {email:email},
                {$set:{password:PasswordHash}}
            )
            res.status(200).json({success:true,redirect:"/signin"});
        }else{
            res.status(500).json({success:false,message:"Email is not valid, please try again..."})
        }

        
        
        
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

//loading user profile

const loadProfilepage = async (req,res)=>{
    try {
        
        
        
        const user = req.session.userId || req.session.user?._id
        const userData = await User.findOne({_id:user,isBlocked:false});
        
        res.render('profile',{user:userData});
    } catch (error) {
        console.log('Profile page not found');
        res.status(500).send('Server error')
        
    }
}

const editProfile = async (req,res)=>{
    try {
        console.log('changing profile...');
        const user = req.session.userId || req.session.user?._id
        const formData = req.body
        const {dob} = formData
        console.log('files',dob);
        
        console.log(user);
        
        if(req.file){
            const imagePath = '/uploads/profile/' + req.file.filename;
            const upUser =  await User.findByIdAndUpdate(user, { profileImage: imagePath });
            console.log(upUser);
           return res.json({ success: true, imagePath });
        }

        if(formData){
            console.log(formData)
            console.log(user);

            if (formData.dob) {
                const { valid, date, message } = validateDOB(formData.dob);
                if (!valid) {
                    return res.json({ success: false,existFound:true,existFoundField:'dob', message });
                }
             formData.dob = date;
            }
            
            const checkNum = await User.findOne({phone:formData.phone,_id:{$ne: user}})
            
            
          if (checkNum) {
            return res.json({ success: false,existFound:true, existFoundField: 'phone',message:"This phone Number already exist",});
          }

            
            await User.findByIdAndUpdate(user,formData);
           return res.json({ success: true});
        }
        
        res.json({ success: false,message:"Error while updateing profile Plaese try again..."});
        
       
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Image upload failed' });
      }
}

const changeEmail = async (req,res)=>{
    try {
        const {email}  = req.body
        const existEmail = await User.findOne({email})
        if(!existEmail ){
           const otp = generateOTP()   // otp created
            console.log(otp)
            const emailSend = await sendVerificationEmail(email,otp);

            if(emailSend){
                req.session.userOTP = otp;
                req.session.email = email;
                res.status(200).json({ success: true});
            }else{
                return res.status(500).json({ success: false, message: "Failed to send email. Try again later." });
            }
        }else{
           return res.json({success:false,message:"This email is already in use"})
        }

    } catch (error) {
        console.log('Profile page not found');
        res.status(500).send('Server error')
        
    }
}

const verifyChangeEmail = async (req,res)=>{
    try {
        const {oldEmail,email,otp}  = req.body
        
        if(otp){
            if(otp===req.session.userOTP){
               const uPDate =  await User.updateOne(
                {email:oldEmail},
                {$set:{email:email}}
            )
            return res.json({success:true})
            }else{
                return res.json({success:false,message:"Enter the correct OTP"})
            }
        }

    } catch (error) {
        console.log('Profile page not found');
        res.status(500).send('Server error')
        
    }
}



const changePassword = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Both fields are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    console.log(isPasswordCorrect)
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Current password is incorrect." });
    }

    function isValidPassword(password) {
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return regex.test(password);
    }

    
    if (!isValidPassword(newPassword)) {
     return res.status(400).json({ success: false, message: "Password must be at least 8 characters long and contain both letters and numbers.." });
    }


    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ success: false, message: "New password must be different from the current password." });
    }

    const otp = generateOTP();
    const emailSent = await sendVerificationEmail(user.email, otp);

    console.log(otp)
    if (emailSent) {
      req.session.userOTP = otp;
      req.session.pendingPassword = newPassword;
      return res.status(200).json({ success: true, message: "OTP sent to your email." });
    } else {
      return res.status(500).json({ success: false, message: "Failed to send OTP. Try again later." });
    }

  } catch (error) {
    console.error("Error in changePassword controller:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const resendOtp = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    const pendingPassword = req.session.pendingPassword;

    if (!userId || !pendingPassword) {
      return res.status(400).json({ success: false, message: "No pending password change request found." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const otp = generateOTP();
    const emailSent = await sendVerificationEmail(user.email, otp);
    console.log(`Resend OTP: ${otp}`)

    if (emailSent) {
      req.session.userOTP = otp;
      return res.status(200).json({ success: true, message: "OTP resent to your email." });
    } else {
      return res.status(500).json({ success: false, message: "Failed to resend OTP." });
    }

  } catch (error) {
    console.error("Error in resendOtp controller:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};


const verifyPasswordOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.session.userId;
    const storedOtp = req.session.userOTP;
    const newPassword = req.session.pendingPassword;

    if (!otp || !storedOtp || !newPassword) {
      return res.status(400).json({ success: false, message: "Missing data. Please try again." });
    }

    if (otp !== storedOtp) {
      return res.status(401).json({ success: false, message: "Invalid OTP." });
    }

    const hashedPassword = await securePassword(newPassword);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    req.session.userOTP = null;
    req.session.pendingPassword = null;

    return res.status(200).json({ success: true, message: "Password updated successfully." });

  } catch (error) {
    console.error("Error in verifyPasswordOtp:", error);
    return res.status(500).json({ success: false, message: "Something went wrong." });
  }
};



module.exports = {
    loadForgotPassword,
    forgotEmailValid,
    loadForgotPassOTP,
    verifyForgotPasssOTP,
    resendforgotPasssOTP,
    loadResetPassword,
    resetPassword,
    loadProfilepage,
    editProfile,
    changeEmail,
    verifyChangeEmail,
    changePassword,
    resendOtp,
    verifyPasswordOtp
}