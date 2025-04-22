const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");






const  categoryInfo = async(req,res)=>{
    try {
        
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page-1)*limit;
        const searchQuery = req.query.search || "";

        

        //searchregex
        const searchRegex = new RegExp(searchQuery, "i");

        const filter = searchQuery? { name: { $regex: searchRegex } }: {};

        
        const categoryData = await Category.find(filter)
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories/limit)

        res.render('category',{
            cat:categoryData,
            currentPage:page,
            totalPages:totalPages,
            totalCategories:totalCategories,
            searchQuery: searchQuery
        })

    } catch (error) {
        
        console.log(error);
        res.redirect('/pageerror')

    }

}

const  addCategory = async(req,res)=>{
    const {name,description} = req.body
    try {
        
        const existingCategory = await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error:'Category already exists'});
        }

        const newCategory = new Category({
            name,
            description
        })

        await newCategory.save();
        return res.json({message:"Category add successfully"})
       
    } catch (error) {
        
        console.log(error);
        return res.status(500).json({error:"Internal Sever Error"})

    }

}

const  addCategoryOffer = async(req,res)=>{
    try {
        
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        console.log("Backend",categoryId);
        

        const category = await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({status:false,message:"Category not found"});
        }
        const products = await Product.find({category:category._id});
        const hasProductOffer = products.some((product)=>product.productOffer > percentage);
        if(hasProductOffer){
            return res.json({status:false,message:"Products with in this category already have product offer"})
        }
        await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

        for(const product of products){
            product.productOffer = 0;
            product.salePrice = product.regularPrice;
            await product.save();
        }

        res.json({status:true})
       
    } catch (error) {
        
        console.log(error);
        res.status(500).json({status:false, message: "Internal Server Error"});
    }

}

const  removeCategoryOffer = async(req,res)=>{
    try {
        
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId);

        if(!category){
            return res.status(404).json({status:false,message:"Category not found"});
        }

        const percentage = category.categoryOffer;
        const products = await Product.find({category:category._id});

        if(products.length >0){
            for(const product of products){
                product.salePrice += Math.floor(product.regularPrice * (percentage/100));
                product.productOffer = 0;
                await product.save();
            }
        }

        category.categoryOffer = 0;
        await category.save();
        res.json({status:true})
       
    } catch (error) {
        
        console.log(error);
        res.status(500).json({status:false, message: "Internal Server Error"});
    }

}

const  listCategory = async(req,res)=>{
    try {
        console.log('reched list');
        
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:false}});
        res.redirect('/admin/category')
       
    } catch (error) {
        
        console.log(error);
        res.redirect("/pageerror");
    }

}

const  unlistCategory = async(req,res)=>{
    try {
        
        let id = req.query.id
        await Category.updateOne({_id:id},{$set:{isListed:true}});
        res.redirect('/admin/category')
       
    } catch (error) {
        
        console.log(error);
        res.redirect("/pageerror");
    }

}

const updateCategory = async(req,res)=>{
    console.log("hey u");
    try {
        
        const { id, name, description } = req.body;
    
        // Basic validation
        if (!id || !name || !description) { return res.status(400).json({ status: false, message: 'Missing required fields' })}
    
        // Check if a category with the same name already exists (and it's not the same category)
        const existingCategory = await Category.findOne({ name: name.trim(), _id: { $ne: id } });

        if (existingCategory) {return res.status(409).json({ status: false, message: 'Category name already exists' })}
    
        // Update the category
        const updated = await Category.findByIdAndUpdate(id, {
          name: name.trim(),
          description: description.trim()
        });
    
        if (!updated) {return res.status(404).json({ status: false, message: 'Category not found' })}
    
        return res.status(200).json({ status: true, message: 'Category updated successfully' });
      } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ status: false, message: 'Server error' });
      }

}





module.exports = {
    categoryInfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    listCategory,
    unlistCategory,
    updateCategory
}