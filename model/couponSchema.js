const mongoose = require('mongoose');
const {Schema} = mongoose;


const couponSchema = new mongoose.Schema({
    name:{
      type: String,
      required: true,
      unique: true
    },

    createdOn:{
      type: Date,
      default: Date.now(),
      required: true
    },

    expireOn:{
      type: Date,
      require: true
    },

    offerPrice:{
      type: Number,
      required:true
    },

    minimumPrice:{
      type: Number,
      required: true
    },

    islist:{
      type: Boolean,
      defualt: true
    },

    userId:{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
})

const Coupon = mongoose.model('Coupon',couponSchema);
module.exports = Coupon;