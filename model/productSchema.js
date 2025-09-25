const mongoose = require('mongoose');
const {Schema} = mongoose;

const productSchema = new mongoose.Schema({
   productName: {
    type: String,
    required: true
   },

   description: {
    type: String,
    required: true
   },

   category: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
    required: true
   },

   images: [{
    type: String
    }],

   variants: [{
    color: {
        type: String
    },
    size: {
        type: String,
        enum: ['Small', 'Medium', 'Large']
    },
    material: {
        type: String
    },
    quantity: {
        type: Number,
        
    },
    regularPrice: {
        type: Number,
        
    },
    salePrice: {
        type: Number,
        
    },
    offerPercentage:{
        type: Number,
        max: 100
    },
    offername:{
        type:String,
    },
    finalPrice: {
        type: Number,
    }

}],
   isBlocked:{
    type: Boolean,
    default: false
   },
   status:{
    type: String,
    enum: ["Available","Out of stock","Discountinued"],
    required: true,
    default: "Available"
   }

},{timestamps:true});

const Product = mongoose.model('Product',productSchema);
module.exports = Product;