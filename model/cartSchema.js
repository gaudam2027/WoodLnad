const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  items: [
    {
      productid: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      variantId: {
        type: Schema.Types.ObjectId,
        required: true
      },
      quantity: {
        type: Number,
        default: 1
      }
    }
  ]
});

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
