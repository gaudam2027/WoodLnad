const mongoose = require('mongoose');
const { Schema } = mongoose;

const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },

  description: {
    type: String,
  },

  createdOn: {
    type: Date,
    default: Date.now,
    required: true
  },

  startOn: {
    type: Date,
    required: true
  },

  expireOn: {
    type: Date,
    required: true
  },

  offerPrice: {
    type: Number,
    required: true
  },

  minimumPrice: {
    type: Number,
    required: true
  },

  usageLimit: {
    type: Number,
    default: 2,
  },

  isList: {
    type: Boolean,
    default: true
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // New field for user-specific coupons (referrals, welcome coupons, etc.)
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null // null means it's a global coupon
  },

  // You can still keep usedBy if you want usage tracking
  usedBy: [{
    user: { type: Schema.Types.ObjectId, ref: "User" },
    count: { type: Number, default: 0 }
  }]
});

const Coupon = mongoose.model("Coupon", couponSchema);
module.exports = Coupon;
