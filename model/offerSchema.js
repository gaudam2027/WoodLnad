const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Product', 'Category'], // Offer can apply to either
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'type' // Dynamically references 'Product' or 'Category'
  },
  offerName: {
    type: String,
    required: true
  },
  offerPercentage: {
    type: Number,
    required: true,
    min: 1,  // minimum 1%
    max: 100 // maximum 100%
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'expired']
  },
  isListed: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


const Offer = mongoose.model('Offer',offerSchema);
module.exports = Offer
