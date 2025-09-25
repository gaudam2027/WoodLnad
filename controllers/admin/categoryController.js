const Category = require("../../model/categorySchema");
const Product = require("../../model/productSchema");
const Offer = require("../../model/offerSchema")


const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || "";

        // search regex
        const searchRegex = new RegExp(searchQuery, "i");
        const filter = searchQuery ? { name: { $regex: searchRegex } } : {};

        // fetch categories with pagination
        const categoryData = await Category.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments(filter);
        const totalPages = Math.ceil(totalCategories / limit);

        // fetch all active offers for these categories
        const categoryIds = categoryData.map(cat => cat._id);

        const offers = await Offer.find({
            type: "Category",
            targetId: { $in: categoryIds },
            status: "active" 
        });

        // group offers by category
        const offersByCategory = {};
        categoryIds.forEach(id => (offersByCategory[id] = []));
        
        offers.forEach(offer => {
            const catId = offer.targetId.toString();
            offersByCategory[catId].push({
                offerName: offer.offerName,
                startDate: offer.startDate,
                endDate: offer.endDate,
                isListed: offer.isListed
            });
        });

        res.render("category", {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories,
            searchQuery: searchQuery,
            offersByCategory
        });

    } catch (error) {
        console.log(error);
        res.redirect("/pageerror");
    }
};



const  addCategory = async(req,res)=>{
    const {name,description} = req.body
    try {
        
        const existingCategory = await Category.findOne({
            name: { $regex: `^${name}$`, $options: 'i' }
        });
        if(existingCategory){
            return res.status(400).json({success:false,message:'Category already exists'});
        }

        const newCategory = new Category({
            name,
            description
        })

        await newCategory.save();
        return res.json({success:true,message:"Category add successfully"})
       
    } catch (error) {
        
        console.log(error);
        return res.status(500).json({error:"Internal Sever Error"})

    }

}





const categoryList = async (req, res) => {
    try {
      const { id, isListed } = req.body;
  
      const newStatus = Boolean(isListed);
  
      const updated = await Category.findByIdAndUpdate(
        id,
        { isListed: newStatus },
        { new: true }
      );
  
      if (updated) {
        res.json({ success: true, newStatus: updated.isListed });
      } else {
        res.json({ success: false });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false });
    }
  };
  

  


const updateCategory = async(req,res)=>{
    try {
        
        const { id, name, description } = req.body;
    
        // Basic validation
        if (!id || !name || !description) { return res.status(400).json({ success: false, message: 'Missing required fields' })}
    
        // Check if a category with the same name already exists (and it's not the same category)
        const existingCategory = await Category.findOne({
          name: { $regex: `^${name.trim()}$`, $options: "i" },
          _id: { $ne: id }
        });

        if (existingCategory) {return res.status(409).json({ success: false, message: 'Category name already exists' })}
    
        // Update the category
        const updated = await Category.findByIdAndUpdate(id, {
          name: name.trim(),
          description: description.trim()
        });
    
        if (!updated) {return res.status(404).json({ success: false, message: 'Category not found' })}
    
        return res.status(200).json({ success: true, message: 'Category updated successfully' });
      } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ status: false, message: 'Server error' });
      }

}





module.exports = {
    categoryInfo,
    addCategory,
    categoryList,
    updateCategory
}