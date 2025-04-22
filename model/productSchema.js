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
//    color: {
//     type: String
//    },
   images: [{
    type: String
    }],
    // quantity: {
    //     type: Number,
    //     required: true
    // },
    // regularPrice: {
    //     type: Number,
    //     required: true
    // },
    // salePrice: {
    //     type: Number,
    //     required: true
    // },
    
    // offerPrice: {
    //     type: Number, // Discounted price for this variant
    //     required: false
    // },


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
    
    offerPrice: {
        type: Number, // Discounted price for this variant
        required: false
    }
}],

   productOffer:{
    type: Number,
    default:0
   },

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