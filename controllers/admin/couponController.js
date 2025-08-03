const Coupon = require("../../model/couponSchema");
const User = require("../../model/userSchema");

const couponsPage = async(req,res)=>{
    try {
        const searchQuery = req.query.search || '';

        const coupons = await Coupon.find({
      name: { $regex: searchQuery, $options: 'i' }
    }).sort({ createdOn: -1 });


        console.log('here is your cp',coupons);
        

       
        
        res.render('couponManagement',{coupons,searchQuery })
    } catch (error) {
        
    }
}

const addCoupons = async(req,res)=>{
   try {
    const { name, offerPrice, minimumPrice,startOn, expireOn } = req.body;


   

    const existingCoupon = await Coupon.findOne({name});
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
      offerPrice,
      minimumPrice,
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
      const update = req.body;
      const id = req.params.id

        console.log(id)
        console.log(update)

        const updatedCoupon = await Coupon.findByIdAndUpdate(id,update,{ new: true, runValidators: true });
        
        if (!updatedCoupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    res.json({ success: true, message: 'Coupon updated successfully', coupon: updatedCoupon });
        
    } catch (error) {
        
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
    addCoupons,
    editCoupons,
    listCoupons
}