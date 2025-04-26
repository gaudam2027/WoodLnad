const User = require('../../model/userSchema');
const Category = require('../../model/categorySchema');
const Product = require('../../model/productSchema');
const nodemailer =  require('nodemailer')
const env = require('dotenv').config();
const bcrypt = require("bcrypt");


//loading error page
const pageNotFound = async (req,res)=>{
    try {
        
        res.render('page-404')
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}




const loadHomepage = async (req, res) => {
    try {
      
        const user = req.session?.userId||req.session.user?._id  //passport and normal login and sign up user id session
      
        
        
        
        const categories = await Category.find({isListed:true});
        let productData = await Product.find(
            {isBlocked:false,
             category:{$in:categories.map(category=>category._id)},
             variants: { $elemMatch: { quantity: { $gt: 0 } } }
            }
        )
        
        

        productData.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
        productData = productData.slice(0,4)



        if (user) {
           const userData = await User.findOne({_id:user});
           console.log(userData);
           return res.render('home',{user:userData,products:productData});
           
        }
           return res.render('home',{user,products:productData});
        
        
    } catch (error) {
        console.log('Home page not found', error);
        res.status(500).send('Server error');
    }
};


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
            req.session.user = saveUserData;
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

        req.session.user = findUser;
        res.json({success: true,redirectUrl: '/'});

    } catch (error) {
        
        console.error("login error",error);
        res.status(500).json({success:false,message:"An error occured"})
        
    }
}

//------------------------------------------------------------------------shop-page-------------------------------------------------------------

const loadShoppage = async (req, res) => {
    try {
        console.log('shop');
        
      const user = req.session?.userId || req.session.user?._id
      
      
      const searchQuery =  "";
      const userData = await User.findOne({ _id:user});
      console.log(userData);
      const categories = await Category.find({ isListed: true });
      const categoriesIds = categories.map(category => category._id.toString());

  
      const page = parseInt(req.query.page || 1);
      const limit = 9;
      const skip = (page - 1) * limit;
  
      // Search filter

  
      const query = {
        isBlocked: false,
        category: { $in: categoriesIds },
        variants: { $elemMatch: { quantity: { $gt: 0 } } },
      };
  
      const products = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
  
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);
  
      const categoriesWithIds = categories.map(category => ({
        _id: category._id,
        name: category.name
      }));

      
      // unique variants type
      let allVariants = [];
      
        products.forEach(product => {
        product.variants.forEach(variant => {
            allVariants.push(variant);
        });
    });

        // Use JSON.stringify to compare full object uniqueness
        const uniqueVariants = Array.from(
            new Map(allVariants.map(obj => [JSON.stringify(obj), obj])).values()
        );
        

  
      res.render('shop', {
        user: userData,
        products,
        category: categoriesWithIds,
        variants: uniqueVariants,
        totalProducts,
        currentPage: page,
        totalPages,
        searchQuery: searchQuery,
      });
    } catch (error) {
      console.log('shop page not found', error);
      res.status(500).send('Server error');
    }
  };

  //filter product

  const filterProduct = async (req, res) => {
    try {
        console.log('filter');
        const { category,price,color,sortBy,search,page = 1 } = req.body;
        const user = req.session.userId || req.session.user?._id
        const userData = await User.findOne({_id:user})
        console.log(userData);
        
  
        
        const limit = 9; // number of products per page
        const skip = (page - 1) * limit;
    
        
        let filters = {isBlocked: false,};


        //search products
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search.trim(), "i");
          
            filters.$or = [
              { productName: searchRegex },
              { "variants.color": searchRegex } // searchin in inside the variants array's color field
            ];
          }
        
          if (category) {
            const foundCategory = await Category.findOne({ name: category, isListed: true });
            if (foundCategory) {
              filters.category = foundCategory._id;
            } else {
              return res.status(404).send('Category not found or not listed');
            }
          } else {
            
            const listedCategories = await Category.find({ isListed: true }).select('_id');
            const listedCategoryIds = listedCategories.map(cat => cat._id);
            filters.category = { $in: listedCategoryIds };
          }

        if (price || color) {
            const variantFilter = {};
            // Price filter inside variants array
            if (price) {
              const [min, max] = price.split('-').map(Number);
              variantFilter.salePrice = { $gte: min, $lte: max };
            }
            // Color filter inside variants array
            if (color && Array.isArray(color)) {
                variantFilter.color = { $in: color };
              } else if (color) {
                variantFilter.color = color;
              }

            // Apply $elemMatch to combine price and color filters
            if (Object.keys(variantFilter).length > 0) {
              filters['variants'] = { $elemMatch: variantFilter };
            }
          }

    
          let query = Product.find(filters);
          
          let sortOption = {};
            if (sortBy === "priceAsc") {
            sortOption["variants.0.salePrice"] = 1;
            } else if (sortBy === "priceDesc") {
            sortOption["variants.0.salePrice"] = -1;
            } else if (sortBy === "az") {
            sortOption.productName = 1;
            } else if (sortBy === "za") {
            sortOption.productName = -1;
            } else {
            sortOption.createdAt = -1; // default newest first
          }

          const totalProducts = await Product.countDocuments(filters);
          const totalPages = Math.ceil(totalProducts / limit);

          const products = await query
          .sort(sortOption)
          .skip(skip)
          .limit(limit);
        res.json({ success: true,user:userData, products,totalPages,currentPage: page});
      } catch (err) {
        console.error('Error filtering products:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
      }
  };
  

  const shopDetails = async (req, res) => {
    try {

        const user = req.session.userId || req.session.user?._id
        console.log('Reached shop details');

        const userData = await User.findOne({_id:user})
        const productId = req.query.id; 

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send("Product not found");
        }

        const relatedProducts = await Product.find({
            _id: { $ne: productId },  
            category: product.category 
        }).limit(4); 

        res.render('shop-details', {
            user:userData,
            product,
            relatedProducts 
        });

    } catch (error) {
        console.error('Shop-details page error:', error);
        res.status(500).send('Server error');
    }
};

  

const loadProfilepage = async (req,res)=>{
    try {
        console.log('reached');
        
        

        
        
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
            return res.redirect('/')
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
    loadShoppage,
    filterProduct,
    shopDetails,
    loadProfilepage,
    loadOrderpage,
    logout
}