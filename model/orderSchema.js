const mongoose = require('mongoose');
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new mongoose.Schema({
          orderId: {
            type: String,
            default: () => uuidv4(),
            unique: true
          },
          user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
          },
          orderitems: [{
            product: {
              type: Schema.Types.ObjectId,
              ref: 'Product',
              required: true
            },
            variantId: {
            type: Schema.Types.ObjectId,
            required: true
            },
            quantity: {
              type: Number,
              required: true
            },
            price: {
              type: Number,
              default: 0
            },
            status: {
            type: String,
             enum: ['Pending','Ordered','Shipped', 'Out For Delivery', 'Delivered', 'Cancelled','Return Request', 'Returned','Return Rejected', 'Return Accepted'],
            default: 'Pending'
          },
          cancellationReasonTitle:{
            type: String,
            enum: ['Ordered by mistake', 'Changed mind','Found better price', 'Other'],
            default: null
          },
          cancellationReason: {
            type: String,
            default: 'none',
            required:true
          },
          returnReasonTitle: {
            type: String,
            enum: ['Wrong item received', 'Item damaged', 'Item not as described', 'Size/fit issue', 'Other'],
            default: null
          },
          returnReason: {
            type: String,
            default: 'none'
          },
          discount: {
            type: Number,
            default: 0
          },
          returnApproved: {
            type: Boolean,
            default: false
          },
          canRequestReturn: {
             type: Boolean,
            default: true 
          },
          updatedAt: { type: Date }
          }],
           orderStatus: {
            type: String,
            enum: ['Pending', 'Ordered', 'Cancelled', 'Partially Cancelled', 'Shipped','Out For Delivery', 'Delivered','Return Request', 'Returned','Return Accepted', 'Return Rejected'],
            default: 'Pending'
          },
          cancellationReasonTitle: {
            type: String,
            enum: ['Ordered by mistake', 'Changed mind','Found better price', 'Other'],
            default: null
          },
          cancellationReason: {
            type: String,
            default: 'none'
          },
          cancelledAt: Date,
            cancelledBy: {
              type: String,
              enum: ['user', 'admin']
            },
          returnReasonTitle: {
            type: String,
            enum: ['Wrong item received', 'Item damaged','Item not as described','Size/fit issue','Other'],
            default: null
          },
          returnReason: {
            type: String,
            default: 'none'
          },
          totalPrice: {
            type: Number,
            required: true
          },

          couponDiscount: {
            type: Number,
            default: 0
          },

          finalAmount: {
            type: Number,
            required: true
          },

          shippingAddress: {
            addressType: {
              type: String,
              required: true
            },
            title: {
              type: String,
              required: true
            },
            city: {
              type: String,
              required: true
            },
            state: {
              type: String,
              required: true
            },
            pincode: {
              type: Number,
              required: true
            },
            address: {
              type: String,
              required: true
            },
            landmark: {
              type: String,
              required: true
            },
            phone: {
              type: String,
              required: true
            },
            altPhone: {
              type: String,
              required: true
            },
            email: {
              type: String,
              required: true
            }
          },
          paymentMethod: {
            type: String,
            required: true,
            enum: ['COD', 'UPI', 'Card', 'Wallet']
          },
          paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'pending'
          },
          invoiceDate: {
            type: Date
          },

          createdOn: {
            type: Date,
            default: Date.now,
            required: true
          },

          couponApplied: {
            type: Boolean,
            default: false
          },
          couponCode: {
            type: String,
          }
      });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
