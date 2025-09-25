const Coupon = require("../../model/couponSchema");
const User = require("../../model/userSchema");
const {validateCoupon} = require("../../helpers/validators/couponValidator")

const couponsPage = async(req,res)=>{
    try {
      const coupons = await Coupon.find().sort({ createdOn: -1 });
         
      res.render('couponManagement',{coupons})
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).send('Server Error');
    }
}

const fetchCoupons = async (req,res) =>{
    try {
      const searchQuery = req.query.q?.trim() || '';
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const skip = (page - 1) * limit;

      // Filter by name with regex also case-sensitive
      const filter = searchQuery ? { name: { $regex: searchQuery, $options: 'i' } } : {};
      if (req.query.status === 'active') filter.isActive = true;
      if (req.query.status === 'inactive') filter.isActive = false;

      //sorting
      let sort = {createdOn: -1}
      switch(req.query.sortBy){
        case 'asc' : sort = {createdOn: 1};
        break;
        case 'name-asc' : sort = {name: 1};
        break;
        case 'name-desc' : sort = {name: -1};
        break;
        case 'offerPrice-desc' : sort = {offerPrice: -1}
        break;
        case 'offerPrice-asc' : sort = {offerPrice: 1}
        break;
      }

      const total = await Coupon.countDocuments(filter);
      const coupons = await Coupon.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit);

      res.json({
        success:true,
        coupons,
        total,
        page,
        pages: Math.ceil(total / limit)
      });
    } catch (error) {
      console.error('Error fetching coupons:', error);
      res.status(500).json({ message: 'Server error' });
    }
}

const addCoupons = async(req,res)=>{
   try {
    const { name, offerPrice,usageLimit,description, minimumPrice,startOn, expireOn } = req.body;

    //Coupon validation
    const errors = validateCoupon({ name, offerPrice, usageLimit, description, minimumPrice, startOn, expireOn });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const existingCoupon = await Coupon.findOne({name: { $regex: `^${name}$`, $options: 'i' }});
    if (existingCoupon) {
      return res.status(400).json({ success: false, message: 'Coupon code already exists' });
    }

    const expiryDate = new Date(expireOn);
    if (isNaN(expiryDate.getTime())) {
        console.log('not a num');
        
    return res.status(400).json({ success: false, message: 'Invalid expiry date' });
    }

    const newCoupon = new Coupon({
      name,
      description,
      offerPrice,
      minimumPrice,
      usageLimit,
      startOn,
      expireOn:expiryDate
,
    });

    await newCoupon.save();
    res.json({ success: true, message: 'Coupon added successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

const editCoupons = async(req,res)=>{
    try {
      const{ name, offerPrice,usageLimit,description, minimumPrice,startOn, expireOn } = req.body;
      const id = req.params.id

      //Coupon validation
      const errors = validateCoupon({ name, offerPrice, usageLimit, description, minimumPrice, startOn, expireOn });
      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: errors[0], errors });
      }

      //For avoiding undifined values
      const update = {}
      Object.entries({ name, offerPrice, usageLimit, description, minimumPrice, startOn, expireOn }).forEach(
        ([key, value]) => {
          if (value !== undefined) update[key] = value;
        }
      );

      const updatedCoupon = await Coupon.findByIdAndUpdate(id,update,{ new: true, runValidators: true });
        
      if (!updatedCoupon) {
        return res.status(404).json({ success: false, message: 'Coupon not found' });
      }

      res.json({ success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
        
    } catch (error) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
}

const listCoupons = async(req, res) => {
  const { couponId, isList } = req.body;
  try {
    await Coupon.findByIdAndUpdate(couponId, { isList });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update failed." });
  }
}

module.exports = {
    couponsPage,
    fetchCoupons,
    addCoupons,
    editCoupons,
    listCoupons
}