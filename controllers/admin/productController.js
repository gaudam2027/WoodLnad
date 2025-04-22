const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const User = require('../../model/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');


const productsPage = async(req,res)=>{
    try {

        let search = req.query.search || "";
        let page = parseInt(req.query.page) || 1;
        let limit = 4;
        const products = await Product.find({
            $or:[

                {productName:{$regex:new RegExp(".*"+search+".*","i")}}
            ]
            
        })
        .limit(limit*1)
        .skip((page - 1) * limit) 
        .populate('category')
        .exec();

        const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}}
            ],
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);
        const category = await Category.find({isListed:true});
        

        if(category){

            res.render('products',{products:products,cat:category,searchQuery:search,totalPages:totalPages,currentPage:page})
        }else {
            res.render("page-404");
        }


        
    } catch (error) {

        res.redirect('/pageerror')
        
    }
}


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
        const variants = req.body.variants || [];
        const productExists = await Product.findOne({
            productName:products.productName,

        })

        if(!productExists){
            const images = [];

            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath = req.files[i].path;
                    console.log(originalImagePath);
                    
                    
                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            const categoryId = await Category.findOne({name:products.category});

            if(!categoryId){
                return res.status(400).join('Invalid category name')
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                createdOn:new Date(),
                quantity:products.quantity,
                size:products.size,
                color:products.color,
                images:images,
                status:"Available",
                variants: variants,

            })

            await newProduct.save();
            return res.redirect("/admin/addProduct")
        }else{
            return res.status(400).json("Product already exist, please try with another name");
        }

        
    } catch (error) {
        console.error("Error saving product",error);
        
        return res.redirect('/pageerror')
        
    }
}

const productEditPage = async(req,res)=>{
    try {

        const id = req.query.id
        const product = await Product.findOne({_id:id});
        const category = await Category.find({});
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

const blockProduct = async(req,res)=>{
    try {

        const id = req.query.id;

        await Product.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/products')
        
    } catch (error) {

        res.redirect('/pageerror')
        
    }
}

const unblockProduct = async(req,res)=>{
    try {

        const id = req.query.id;

        await Product.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/products')
        
    } catch (error) {

        res.redirect('/pageerror')
        
    }
}



module.exports = {
    productsPage,
    productAddPage,
    addProducts,
    productEditPage,
    editProduct,
    deleteSingleImage,
    blockProduct,
    unblockProduct
}