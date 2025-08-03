const User = require('../../model/userSchema')
const Wallet = require('../../model/walletSchema')
const {validationWallet} = require('../../helpers/validators/walletValidation');
const razorpay = require('../../config/razorpay');
const verifyRazorpaySignature = require('../../helpers/verifyRazorpaySignature')
const withTransaction = require('../../helpers/withTransaction')
//const { describe } = require('node:test');

const manageWallet = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;

    const user = await User.findById(userId);
    let wallet = await Wallet.findOne({ user: userId });

    if (!wallet) {
      wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
      await wallet.save();
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 10; 
    const totalTransactions = wallet.transactions.length;
    const totalTransactionPages = Math.ceil(totalTransactions / limit);

    const startIndex = (page - 1) * limit;
    const paginatedTransactions = wallet.transactions
      .slice()
      .reverse()
      .slice(startIndex, startIndex + limit);

    res.render('wallet', {
      user,
      wallet,
      transactions: paginatedTransactions,
      currentPage: page,
      totalTransactionPages
    });
  } catch (error) {
    console.error('Error managing wallet:', error);
    res.status(500).render('error', { message: 'Something went wrong' });
  }
};

const addMoney = async (req,res) => {

  try {
    const {amount,paymentMethod} = req.body
    const userId = req.session.userId || req.session.user?._id;
    const onlinePay = ['Upi','Debit-Card','Net-Banking']


    const {errMsg} = validationWallet({ amount, paymentMethod })

    if (errMsg) {
      return res.status(400).json({ success: false, message: errMsg });
    }

    if(!onlinePay.includes(paymentMethod)){
      return res.status(400).json({success:false, message:'Only Upi, Net Banking ,debit Card is supported currently.'})
    }


    // creating Razorpay
    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `wallet_add_${Date.now()}`,
      payment_capture:1
    }

    const razorpayOrder = await razorpay.orders.create(options);

    return res.status(200).json({ 
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    })

  } catch (error) {
    console.error('Error in addMoney:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const verifyWalletPayment = async(req,res)=>{

  try {
    const {razorpay_payment_id,razorpay_order_id,razorpay_signature,paymentMethod,amount,} = req.body
    const userId = req.session.userId || req.session.user?._id;

    const {errMsg} = validationWallet({ amount, paymentMethod })

    if (errMsg) {
      return res.status(400).json({ success: false, message: errMsg });
    }
    

    const isValid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    })

    if(!isValid){
      return res.status(400).json({success:false,message:'Payment verification failed. Invalid signature.'})
    }

    await withTransaction(async function (session){
      let wallet = await Wallet.findOne({user:userId}).session();

      if(!wallet){
        wallet = new Wallet({
          user:userId,
          balance: amount,
          transactions: [{type:'credit',amount,paymentMethod}]
        })
      }else{
        wallet.balance += amount;
        wallet.transactions.push({type:'credit',amount,paymentMethod})
      }

      await wallet.save({session});
    })

    res.status(200).json({ success: true, message: 'Money added to wallet.' });


  } catch (error) {
    console.error('Error in wallet payment verification:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = {
    manageWallet,
    addMoney,
    verifyWalletPayment 
}
