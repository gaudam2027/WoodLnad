const crypto = require('crypto');

const verifyRazorpaySignature = ({ orderId, paymentId, signature }) => {
    const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')


    return generatedSignature === signature;
};

module.exports = verifyRazorpaySignature;