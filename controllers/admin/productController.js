const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const Offer = require('../../model/offerSchema')
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');


const productsPage = async (req, res) => {
    try {
        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        let limit = 4;

        // all product for (total count,active product,with offers,etc)
        const allProduct = await Product.find({});

        const products = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate("category")
        .lean()
        .exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } }
            ]
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);
        const category = await Category.find({ isListed: true });

        // ✅ fetch active offers for these products
        const productIds = products.map(p => p._id);

        const offers = await Offer.find({
            type: "Product",
            targetId: { $in: productIds },
            status: "active"
        });

        // group offers by product
        const offersByProduct = {};
        productIds.forEach(id => (offersByProduct[id] = []));
        
        offers.forEach(offer => {
            const productId = offer.targetId.toString();
            offersByProduct[productId].push({
                offerName: offer.offerName,
                startDate: offer.startDate,
                endDate: offer.endDate,
                isListed: offer.isListed
            });
        });

        if (category) {
            res.render("products", {
                allProduct,
                products,
                cat: category,
                searchQuery: search,
                totalPages,
                currentPage: page,
                offersByProduct // ✅ pass to view
            });
        } else {
            res.render("page-404");
        }

    } catch (error) {
        console.log(error);
        res.redirect("/pageerror");
    }
};



const productAddPage = async(req,res)=>{
    try {

        const category = await Category.find({isListed:true});
        res.render('product-add',{cat:category})
        
    } catch (error) {

        res.redirect('/pageerror')
        
    }
}


const addProducts = async(req,res)=>{
  try {
    const products = req.body;


    let variants = [];
    try {
      if (products.variants) {
        variants = typeof products.variants === 'string'
          ? JSON.parse(products.variants)
          : products.variants;
      }
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid variant format' });
    }

    // Checking exist product
    const existingProduct = await Product.findOne({ productName: products.productName });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'Product already exists. Try a different name.' });
    }

    // Handles images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const originalPath = req.files[i].path;
        const resizedPath = path.join('public', 'uploads', 'product-images', req.files[i].filename);

        await sharp(originalPath)
          .resize({ width: 440, height: 440 })
          .toFile(resizedPath);

        images.push(req.files[i].filename);
      }
    }

    // Find category by name
    const categoryDoc = await Category.findOne({ name: products.category });
    if (!categoryDoc) {
      return res.status(400).json({ success: false, message: 'Invalid category name' });
    }

    // Create product document
    const newProduct = new Product({
      productName: products.productName,
      description: products.description,
      category: categoryDoc._id,
      regularPrice: products.regularPrice,
      salePrice: products.salePrice,
      createdOn: new Date(),
      quantity: products.quantity,
      size: products.size,
      color: products.color,
      images: images,
      status: 'Available',
      variants: variants,
    });

    await newProduct.save();

    return res.status(200).json({ success: true, message: 'Product created successfully' });

  } catch (error) {
    console.error('Error saving product:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

const productEditPage = async(req,res)=>{
    try {

        const id = req.query.id
        const product = await Product.findOne({_id:id});
        const category = await Category.find({});
        console.log(product)
        let existingImageCount = product.images.length
        res.render('product-edit',{product:product,cat:category})
        
    } catch (error) {

        res.redirect('/pageerror')
        
    }
}


const editProduct = async(req,res)=>{
    try {

        const id = req.params.id
        const product = await Product.findOne({_id:id});
        console.log(id);
        // console.log(id);
        
        const data = req.body;
        const existingProduct = await Product.findOne({
            productName:data.productName,
            _id:{$ne:id}
        })

        if(existingProduct){
            return res.status(400).json({error:"Product with this name already exists. Please try with another name"})
        }

        const images = [];

        
        
        if(req.files && req.files.length > 0){
            for(let i = 0; i < req.files.length; i++){
                const originalImagePath = req.files[i].path;
        
                const resizedImagePath = path.join('public', 'uploads', 'product-images', req.files[i].filename);
                await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
        
                images.push(req.files[i].filename);
            }
        }
        console.log(data.variants)
        
        const updateFields = {
            productName:data.productName,
            description:data.description,
            category:product.category,
            regularPrice:data.regularPrice,
            salePrice:data.salePrice,
            quantity:data.quantity,
            size:data.size,
            color:data.color,
            variants:data.variants
        }

        if(req.files.length>0){
            updateFields.$push = {images:{$each:images}};
        }

        await Product.findByIdAndUpdate(id,updateFields,{new:true});
        res.redirect("/admin/products");
        
    } catch (error) {

        console.error(error);
        res.redirect('/pageerror')
        
    }
}

const deleteSingleImage = async(req,res)=>{
    try {

        
        const {imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{images:imageNameToServer}});
        const imagePath = path.join("Public","uploads","product-images",imageNameToServer);
        if(fs.existsSync(imagePath)){
            await fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted successfully`);
            
        }else{
            console.log(`Image ${imageNameToServer} not found`);
            
        }

        res.status(200).json({ status: true });
        
    } catch (error) {

        res.redirect('/pageerror');
        
    }
}

const productBlock = async(req,res)=>{
    try {
     
        
        const {productId,block} = req.body;
        const isBlocked = block

        
        if(productId){
            await Product.updateOne({_id:productId},{$set:{isBlocked}});
            return res.json({success:true});
        }

        return res.json({success:false});
        
    } catch (error) {

        return res.redirect('/pageerror')
        
    }
}




module.exports = {
    productsPage,
    productAddPage,
    addProducts,
    productEditPage,
    editProduct,
    deleteSingleImage,
    productBlock
}