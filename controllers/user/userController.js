const User = require('../../model/userSchema');
const Category = require('../../model/categorySchema');
const Product = require('../../model/productSchema');
const Cart = require('../../model/cartSchema');
const Review = require('../../model/reviewschema');
const Wishlist = require('../../model/wishlistSchema');
const Coupon = require('../../model/couponSchema')
const Order = require('../../model/orderSchema')
const nodemailer =  require('nodemailer')
const env = require('dotenv').config();
const bcrypt = require("bcrypt");
const { getIO } = require('../../config/socket'); //for getting socket IO


// function creating new referral code
const generateReferralCode = (name) => {
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${name.slice(0,3).toUpperCase()}${randomStr}`;
};

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
    const user = req.userData || null;

    const categories = await Category.find({ isListed: true });

    // Latest products
    const latestProducts = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(cat => cat._id) },
      "variants.0.quantity": { $gt: 0 }
    }).sort({ createdAt: -1 }).limit(4);

    // Most sold products
    const mostSoldData = await Order.aggregate([
      { $unwind: "$orderitems" },
      { $group: { _id: "$orderitems.product", totalSold: { $sum: "$orderitems.quantity" } } },
      { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "product" } },
      { $unwind: "$product" },
      { $match: { "product.isBlocked": false, "product.variants.0.quantity": { $gt: 0 } } },
      { $sort: { totalSold: -1 } },
      { $limit: 4 }
    ]);
    const mostSoldProducts = mostSoldData.map(p => p.product);

    res.render("home", {
      user,
      latestProducts,
      mostSoldProducts
    });

  } catch (error) {
    console.log("Home page error:", error);
    res.status(500).send("Server error");
  }
};




const loadSignuppage = async (req,res)=>{
    try {
        const referralCode = req.query.ref || null;
        console.log(referralCode)
        
        return res.render('signUp',{referralCode});
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
 
    
    try {
        const { name, phone, email, password , referral } = req.body;

        const findUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (findUser) {
            let message = '';
            if (findUser.email === email && findUser.phone === phone) {
              message = 'User already exists with this email and phone number';
            } else if (findUser.email === email) {
              message = 'User already exists with this email';
            } else if (findUser.phone === phone) {
              message = 'User already exists with this phone number';
            }
      
            return res.json({
              success: false,
              message,
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
        req.session.userData = { name, phone, email, password , referral}; 

        
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

const loadOtp = async (req,res)=>{
    try {
        if(req.session.userOtp){
            return res.render('otp');
        }else{
            res.redirect("/signIn")
        }
    } catch (error) {
        console.log('otp-verification page not found');
        res.status(500).send('Server error')
        
    }
}


// OTP validating
const otp = async (req,res)=>{
    try {
        
        const {otp} = req.body
        console.log(otp);
        console.log('end');
        
        
        
        if(otp===req.session.userOtp){
            const user = req.session.userData
            console.log(user)
            const passwordHash = await securePassword(user.password)

            let referredByUser = null;

            // Check if a referral code was entered at signup
            if (user.referral) {
              referredByUser = await User.findOne({ referralCode: user.referral });
            }

            const saveUserData = new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
                referralCode: generateReferralCode(user.name),
                referredBy: referredByUser ? referredByUser._id : null
            })

            // saving user in user collection
            await saveUserData.save();
            req.session.user = saveUserData;

            if (referredByUser) {
              const shortId = referredByUser._id.toString().slice(-4);
              const datePart = Date.now().toString().slice(-5);
              const referralCoupon = new Coupon({
                name: `REF-${shortId}-${datePart}`,
                description: `Referral reward for inviting ${saveUserData.name}`,
                startOn: new Date(),
                expireOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                offerPrice: 200, 
                minimumPrice: 1000, 
                usageLimit: 1, 
                assignedTo: referredByUser._id, 
            });

            await referralCoupon.save();

            // For storing reffered user detail in referredByUser
            referredByUser.referredUsers = referredByUser.referredUsers || [];
            referredByUser.referredUsers.push(saveUserData._id);
            await referredByUser.save();
          }

            const io = getIO();
            
            io.to('admins').emit('new-user', {
            message: `${saveUserData.name} has signed up.`,
            id: saveUserData._id,
            name: saveUserData.name,
            email: saveUserData.email,
            phone: saveUserData.phone || 'N/A',
            });


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
   
    try {
        
        const {email} = req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }

        const otp = generateOtp()
        req.session.userOtp = otp;
        

       
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

    const user = req.userData || null; // populated from middleware

    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map(category => category._id.toString());

    const page = parseInt(req.query.page || 1);
    const limit = 8;
    const skip = (page - 1) * limit;

    const query = {
      isBlocked: false,
      category: { $in: categoryIds },
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
      name: category.name,
    }));

    // Collect unique variants
    let allVariants = [];
    products.forEach(product => {
      product.variants.forEach(variant => {
        if (!allVariants.some(v => v.color === variant.color && v.size === variant.size)) {
          allVariants.push(variant);
        }
      });
    });
    

    const wishlistItems = await Wishlist.findOne({ user: user?._id }).lean();
    const wishlistProductIds = wishlistItems ? wishlistItems.products.map(p => p.toString()) : [];

    res.render('shop', {
      user,
      products,
      category: categoriesWithIds,
      variants: allVariants,
      totalProducts,
      currentPage: page,
      totalPages,
      wishlistProductIds,
      searchQuery: "", // Can be used for search implementation later
    });
  } catch (error) {
    console.log('shop page not found', error);
    res.status(500).send('Server error');
  }
};


  //filter product

const filterProduct = async (req, res) => {
  try {
      let { category, discount, price, color, sortBy, search, page = 1 } = req.query;
      page = Number(page) || 1;
      discount = Number(discount) || 0;
      console.log('r')

      const user = req.session.userId || req.session.user?._id;
      const userData = await User.findOne({ _id: user, isBlocked: false });

      const limit = 8;
      const skip = (page - 1) * limit;

      let filters = { isBlocked: false };

      // Search
      if (search && search.trim() !== "") {
          const searchRegex = new RegExp(search.trim(), "i");
          filters.$or = [
            { productName: searchRegex },
            { "variants.color": searchRegex }
          ];
      }

      // Category
      if (category) {
          const foundCategory = await Category.findOne({ name: category, isListed: true });
          if (foundCategory) filters.category = foundCategory._id;
      } else {
          const listedCategories = await Category.find({ isListed: true }).select('_id');
          const listedCategoryIds = listedCategories.map(cat => cat._id);
          filters.category = { $in: listedCategoryIds };
      }

      // Variants filters
      if (price || color || discount) {
          const variantFilter = {};

          if (price) {
              if (price.includes('above')) {
                  const min = Number(price.split('-')[1]);
                  variantFilter.salePrice = { $gt: min };
              } else {
                  const [min, max] = price.split('-').map(Number);
                  variantFilter.salePrice = { $gte: min, $lte: max };
              }
          }

          if (color) {
              if (Array.isArray(color)) variantFilter.color = { $in: color };
              else variantFilter.color = color;
          }

          if (discount > 0) variantFilter.offerPercentage = { $gte: discount };

          if (Object.keys(variantFilter).length > 0) {
              filters['variants'] = { $elemMatch: variantFilter };
          }
      }

      let query = Product.find(filters);

      // Sorting
      let sortOption = {};
      if (sortBy === "priceAsc") sortOption["variants.0.salePrice"] = 1;
      else if (sortBy === "priceDesc") sortOption["variants.0.salePrice"] = -1;
      else if (sortBy === "az") sortOption.productName = 1;
      else if (sortBy === "za") sortOption.productName = -1;
      else sortOption.createdAt = -1;

      const totalProducts = await Product.countDocuments(filters);
      const totalPages = Math.ceil(totalProducts / limit);

      const products = await query.sort(sortOption).skip(skip).limit(limit);

      const wishlistItems = await Wishlist.findOne({ user: user?._id }).lean();
      const wishlistProductIds = wishlistItems ? wishlistItems.products.map(p => p.toString()) : [];

      res.json({
          success: true,
          user: userData,
          products,
          wishlistProductIds,
          totalPages,
          currentPage: page
      });
  } catch (err) {
      console.error('Error filtering products:', err);
      res.status(500).json({ success: false, message: 'Server Error' });
  }
};

  

const shopDetails = async (req, res) => {
  try {
    console.log('Shop details request received');
    const user = req.userData || null;
    const userId = user?._id;

    const productId = req.query.id;
    const variantId = req.query.variantId;

    // Fetch product and populate category
    const product = await Product.findOne({_id:productId,isBlocked:false}).populate('category');
    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Get selected variant
    let selectedVariant = product.variants.find(v => v._id.toString() === variantId);
    if (!selectedVariant) {
      selectedVariant = product.variants[0]; // fallback
    }


    // Calculate remaining stock for all variants (considering cart items)
    let variantsWithRemainingStock = [];
    let cart = null;

    if (userId) {
      cart = await Cart.findOne({ userId });
      if (!cart) {
        cart = new Cart({ userId, items: [] });
      }
    }

    // Process each variant to calculate remaining stock
    product.variants.forEach((variant, index) => {
      let remainingStock = variant.quantity;

      if (cart) {
        const existingItemIndex = cart.items.findIndex(
          item => item.productid.toString() === productId &&
                  item.variantId?.toString() === variant._id.toString()
        );

        if (existingItemIndex !== -1) {
          const existingQty = cart.items[existingItemIndex].quantity;
          remainingStock = Math.max(remainingStock - existingQty, 0);
        }
      }

      variantsWithRemainingStock.push({
        ...variant.toObject(),
        remainingStock: remainingStock,
        originalQuantity: variant.quantity
      });
    });

    // get remaining stock for selected variant
    const selectedVariantRemainingStockObj = variantsWithRemainingStock.find(v => v._id.toString() === selectedVariant._id.toString());
    const selectedVariantRemainingStock = selectedVariantRemainingStockObj?.remainingStock || 0;


    console.log('Selected variant remaining stock:', selectedVariantRemainingStock);

    // review pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 5; 
    const skip = (page - 1) * limit;



    // review for a specific product from database
    const reviews = await Review.find({ product: productId })
    .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

      

    // review - average rating
    const totalReviews = reviews.length;
    const averageRating = totalReviews === 0
      ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

      // review -star count
      const reviewStats = {
          oneStar: 0,
          twoStar: 0,
          threeStar: 0,
          fourStar: 0,
          fiveStar: 0
        };


        reviews.forEach(review => {
          switch (review.rating) {
            case 1: reviewStats.oneStar++; break;
            case 2: reviewStats.twoStar++; break;
            case 3: reviewStats.threeStar++; break;
            case 4: reviewStats.fourStar++; break;
            case 5: reviewStats.fiveStar++; break;
          }
        });

    // related product
    const relatedProducts = await Product.find({
      _id: { $ne: productId },
      category: product.category
    }).limit(4);

    res.render('shop-details', {
      user,
      product,
      selectedVariant,
      variantId,
      remainingStock: selectedVariantRemainingStock,
      variantsWithRemainingStock,
      relatedProducts,
      reviews,
      averageRating: averageRating.toFixed(1),
      totalReviews,
      reviewStats 
    });

  } catch (error) {
    console.error('Shop-details page error:', error);
    res.status(500).send('Server error');
  }
};

const submitReview = async(req,res)=>{
  try {
    const { productId,rating,comment } = req.body;
    console.log('pID',rating)
    const review = new Review({ user: req.userData._id, product: productId, rating, comment });
    const savedReview = await review.save();

    if(savedReview){
      res.json({ success: true });
    }
  } catch (err) {
    console.log('error',err)
    res.json({ success: false });
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
    submitReview,
    logout
}

