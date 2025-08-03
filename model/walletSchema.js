const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
    min: 0,
  },
  transactions: [
    {
      type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true,
      },
      amount: {
        type: Number,
        required: true,
        min: 0,
      },
      paymentMethod: {
        type: String,
        enum: ['Upi','Debit-Card','Net-Banking'],
        required: false,
      },
      reference: {
        type: String, 
      },
      description: {
        type: String,
      },
      date: {
        type: Date,
        default: Date.now,
      }
    }
  ]
}, {
  timestamps: true
});

const Wallet = mongoose.model('Wallet', walletSchema);
module.exports = Wallet;
