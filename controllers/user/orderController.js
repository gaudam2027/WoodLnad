const User = require('../../model/userSchema');
const Product = require('../../model/productSchema');
const Order = require('../../model/orderSchema');
const Coupon = require('../../model/couponSchema');
const Cart = require('../../model/cartSchema')
const Wallet = require('../../model/walletSchema')
const razorpay = require('../../config/razorpay');
const crypto = require('crypto');
const {calculateRefundAmount} = require('../../helpers/cuponDiscoundRefund')
const { getIO } = require('../../config/socket'); //for getting socket IO


const loadOrderSuccess = async(req, res) => {
   const user = req.session.userId || req.session.user?._id
   const userData = await User.findOne({_id:user,isBlocked:false});
  const { orderId } = req.query;
  const order = await Order.findOne({_id:orderId})
  res.render('orderSuccess', {orderId ,user:userData});
}

const loadOrderFailure = async(req, res) => {
  try {
    const user = req.session.userId || req.session.user?._id
    const userData = await User.findOne({_id:user,isBlocked:false});

    if (!userData) {
      return res.redirect('/login');
    }
    const { orderId } = req.query;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.redirect('/order');
    }

      const shortOrderId = order._id.toString().slice(-6);
      // Generate a new Razorpay order for retry
      const options = {
        amount: order.finalAmount * 100, // paise
        currency: "INR",
        receipt: `retry_${shortOrderId}_${Date.now()}`.slice(0, 40)
      };

      const razorpayOrder = await razorpay.orders.create(options);
    res.render('orderFailure', { order ,user:userData,finalAmount: order.finalAmount,razorpayOrderId: razorpayOrder.id,razorpayKey: process.env.RAZORPAY_KEY_ID});
  } catch (error) {
    console.error('Failed to load failure page',error)
  }
}

const retryPaymentVerify = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
    const userId = req.session.userId || req.session.user?._id;

    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) return res.json({ success: false, message: "Order not found" });

    if (order.paymentStatus === 'paid') {
      return res.json({ success: true, orderId: order._id });
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.json({ success: false, message: "Invalid payment signature" });
    }

    // Fetch cart for removing purchased items
    const cart = await Cart.findOne({ userId }).populate("items.productid");

    // Check stock and calculate final price
    const inStockItems = [];
    for (const item of order.orderitems) {
      const product = await Product.findById(item.product);
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
      if (!variant || variant.quantity < item.quantity) {
        return res.json({ success: false, message: `Item out of stock: ${product.name}` });
      }
      inStockItems.push({ product, variant, quantity: item.quantity });
    }

    // Decreasing stock
    for (const item of inStockItems) {
      item.variant.quantity -= item.quantity;
      await item.product.save();
      getIO().emit("stock-update", {
        productId: item.product._id.toString(),
        variantId: item.variant._id,
        remainingStock: item.variant.quantity
      });
    }

    // Handle coupon usage if applied
    if (order.couponApplied && order.couponCode) {
      const coupon = await Coupon.findOne({ name: order.couponCode });
      if (coupon) {
        const userUsage = coupon.usedBy.find(u => u.user.toString() === userId.toString());
        if (userUsage) {
          userUsage.count += 1;
        } else {
          coupon.usedBy.push({ user: userId, count: 1 });
        }
        await coupon.save();
      }
    }

    // Remove purchased items from cart
    if (cart) {
      cart.items = cart.items.filter(cartItem => 
        !order.orderitems.some(oItem =>
          oItem.product.equals(cartItem.productid._id) &&
          oItem.variantId.toString() === cartItem.variantId.toString()
        )
      );
      await cart.save();
    }

    // Update order as paid
    order.paymentStatus = 'paid';
    order.paymentMethod = 'Card';
    order.razorpayOrderId = razorpay_order_id;
    order.razorpayPaymentId = razorpay_payment_id;
    order.orderStatus = 'Processing';
    for(item in order.orderitems){
      item.status = 'Processing'
    }
    await order.save();

    res.json({ success: true, orderId: order._id, redirect: "/order/success" });

  } catch (err) {
    console.error("Retry Payment Verify Error:", err);
    res.json({ success: false, message: "Server error during payment verification" });
  }
};




const loadOrderpage = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    const userData = await User.findOne({ _id: userId, isBlocked: false });
    if (!userData) {
      return res.status(403).redirect('/login?error=User is blocked or not logged in');
    }

    const perPage = 3;
    const currentPage = parseInt(req.query.page) || 1;

    const totalOrders = await Order.countDocuments({ user: userId });
    const totalPages = Math.ceil(totalOrders / perPage);

    const orders = await Order.find({ user: userId })
      .populate({
        path: 'orderitems.product',
        select: 'productName images variants' // Adjust fields based on your Product schema
      })
      .sort({ createdOn: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    // Prepare order data with associated items
    const ordersWithItems = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      createdOn: order.createdOn,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      shippingAddress: order.shippingAddress,
      finalAmount: order.finalAmount,
      couponCode: order.couponCode || null,
      couponDiscount: order.couponDiscount || 0,
      cancelReasonTitle: order.cancellationReasonTitle,
      cancelReason: order.cancellationReason,
      returnReasonTitle: order.returnReasonTitle,
      returnReason: order.returnReason,
      items: order.orderitems.map(item => {
        const variant = item.product?.variants?.find(
          v => v._id.toString() === item.variantId?.toString()
        );

        return {
          _id: item._id,
          product: {
            productName: item.product?.productName || 'Unknown Product',
            images: item.product?.images || []
          },
          variantId: item.variantId,
          variant: variant || null,
          quantity: item.quantity,
          price: item.price,
          status: item.status,
          returnReasonTitle: item.returnReasonTitle,
          returnReason: item.returnReason,
          canRequestReturn: item.canRequestReturn
        };
      })
    }));
  

    // Define cancel and return reasons based on schema enums
    const cancelReasons = [
      'Ordered by mistake',
      'Changed mind',
      'Found better price',
      'Other'
    ];
    const returnReasons = [
      'Wrong item received',
      'Item damaged',
      'Item not as described',
      'Size/fit issue',
      'Other'
    ];

    // Render the orders page
    res.render('myOrders', {
      user: userData,
      orders: ordersWithItems,
      currentPage,
      totalPages,
      cancelReasons,
      returnReasons
    });
  } catch (error) {
    console.error('Failed to load order page:', error);
    res.status(500).render('error', {
      message: 'An error occurred while loading your orders. Please try again later.',
      error
    });
  }
};



const orderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.session.userId || req.session.user?._id;

    const userData = await User.findOne({ _id: userId, isBlocked: false });
    if (!userData) {
      return res.redirect('/login');
    }

    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate({
        path: 'orderitems.product',
        populate: { path: 'category' }
      })
      .lean();

    if (!order) {
      return res.status(404).render('404', { message: 'Order not found' });
    }

    const cancelReasons = [
      'Ordered by mistake',
      'Changed mind',
      'Found better price',
      'Other'
    ];
    const returnReasons = [
      'Wrong item received',
      'Item damaged',
      'Item not as described',
      'Size/fit issue',
      'Other'
    ];

    res.render('orderDetails', {
      order,
      user: userData,
      cancelReasons,
      returnReasons
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).render('500', { message: 'Server Error' });
  }
};

const handleOrderOrItemAction = async (req, res) => {
  try {
    const { orderId, itemId, action, type, reasonTitle, reason } = req.body;

    if (!orderId || !action || !type || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required data' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    let refundAmount = 0;

    if (type === 'order') {
      if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Return Request') {
        return res.status(400).json({ success: false, message: 'Order already processed' });
      }

      if (action === 'cancel') {
        order.orderStatus = 'Cancelled';
        order.cancellationReasonTitle = reasonTitle;
        order.cancellationReason = reason;

        for (const item of order.orderitems) {
          if (item.status !== 'Cancelled') {
            item.status = 'Cancelled';
            item.cancellationReasonTitle = reasonTitle;
            item.cancellationReason = reason;

            if (order.paymentStatus === 'paid') {
              refundAmount += calculateRefundAmount(order, [item]);
            }

            await Product.findOneAndUpdate(
              { _id: item.product, 'variants._id': item.variantId },
              { $inc: { 'variants.$.quantity': item.quantity } }
            );
          }
          //shipping charge
          refundAmount += order.shippingCharge
        }

      } else if (action === 'return') {
        if (order.orderStatus !== 'Delivered') {
          return res.status(400).json({ success: false, message: 'Only delivered orders can be returned' });
        }

        order.orderStatus = 'Return Request';
        order.returnReasonTitle = reasonTitle;
        order.returnReason = reason;

        for (const item of order.orderitems) {
          if (item.status === 'Delivered') {
            item.status = 'Return Request';
            item.returnReasonTitle = reasonTitle;
            item.returnReason = reason;
          }
        }
      }

    } else if (type === 'item') {
      const item = order.orderitems.id(itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found in order' });
      }

      if (action === 'cancel') {
        item.status = 'Cancelled';
        item.cancellationReasonTitle = reasonTitle;
        item.cancellationReason = reason;

        if (order.paymentStatus === 'paid') {
          refundAmount = calculateRefundAmount(order, [item]);
        }

        await Product.findOneAndUpdate(
          { _id: item.product, 'variants._id': item.variantId },
          { $inc: { 'variants.$.quantity': item.quantity } }
        );

      } else if (action === 'return') {
        if (item.status !== 'Delivered') {
          return res.status(400).json({ success: false, message: 'Only delivered items can be returned' });
        }

        item.status = 'Return Request';
        item.returnReasonTitle = reasonTitle;
        item.returnReason = reason;
      }

      const allCancelled = order.orderitems.every(i => i.status === 'Cancelled');
      const allReturnRequested = order.orderitems.every(i => i.status === 'Return Request');

      if (allCancelled) order.orderStatus = 'Cancelled';
      else if (allReturnRequested) {
        order.orderStatus = 'Return Request';
        if (!order.returnReasonTitle) {
          order.returnReasonTitle = reasonTitle;
          order.returnReason = reason;
        }
      }
    }

    // Refund to Wallet
    if (refundAmount > 0) {
      let wallet = await Wallet.findOne({ user: order.user });
      if (!wallet) {
        wallet = new Wallet({ user: order.user, balance: 0, transactions: [] });
      }

      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: `Order/Item Cancel Refund`,
        reference: order._id.toString(),
      });

      await wallet.save();
    }

    await order.save();

    // emit stock update
    const io = getIO();
    for (const item of order.orderitems) {
      const product = await Product.findById(item.product);
      const variant = product?.variants.find(v => v._id.toString() === item.variantId.toString());
      const remaining = variant?.quantity ?? 0;

      io.emit('stock-update', {
        productId: item.product.toString(),
        variantId: item.variantId.toString(),
        remainingStock: remaining
      });
    }

    res.json({
      success: true,
      message: `${action === 'cancel' ? 'Cancellation' : 'Return'} successful`,
      refund: refundAmount > 0 ? `₹${refundAmount} refunded to wallet` : undefined
    });

  } catch (error) {
    console.error('Action handler error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};










module.exports = {
    loadOrderSuccess,
    loadOrderFailure,
    retryPaymentVerify,
    loadOrderpage,
    orderDetails,
    handleOrderOrItemAction,
    //cancelOrReturnOrderItem,
}