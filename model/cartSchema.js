const mongoose = require('mongoose');
const {Schema} = mongoose;

const cartSchema = new mongoose.Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    items:[{
      productid:{
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity:{
        type: Number,
        defualt: 1
      },
      price:{
        type: Number,
        required: true
      },
      totalPrice:{
        type: Number,
        required: true
      },
      status:{
        type: String,
        defualt: 'placed'
      },
      cancellationReason:{
        type: String,
        defualt: 'none'
      }

    }]
})

const Cart = mongoose.model('Cart',cartSchema);
module.exports = Cart;