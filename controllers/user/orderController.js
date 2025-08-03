const User = require('../../model/userSchema');
const Product = require('../../model/productSchema');
const Order = require('../../model/orderSchema');
const { getIO } = require('../../config/socket'); //for getting socket IO


const loadOrderSuccess = async(req, res) => {
   const user = req.session.userId || req.session.user?._id
   const userData = await User.findOne({_id:user,isBlocked:false});
  const { orderId } = req.query;
  res.render('orderSuccess', { orderId ,user:userData});
}

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

    let discountAmount = 0;
    for (const item of order.orderitems) {
      const product = item.product;
      const variant = product?.variants?.find(v => v._id.toString() === item.variantId.toString());
      if (variant?.offerPrice) {
        discountAmount += variant.offerPrice;
      }
    }

    order.discountAmount = discountAmount;
    order.finalAmount = order.totalPrice - discountAmount;
    order.taxAmount = order.finalAmount * (2 / 100);
    order.finalAmount += order.taxAmount;

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



// const cancelOrReturnOrderItem = async (req, res) => {
//   try {
//     const orderItemId = req.params.id;
//     const { actionType, reasonTitle, customReason } = req.body;
//     // console.log(orderItemId)
//     // console.log(actionType)
    

//     const order = await Order.findOne({ 'orderitems._id': orderItemId });
//     if (!order) {
//       return res.status(404).json({ success: false, message: 'Order not found' });
//     }

//     const item = order.orderitems.id(orderItemId);
//     if (!item) {
//       return res.status(404).json({ success: false, message: 'Order item not found' });
//     }

//     // Apply status changes
//     if (actionType === 'cancel') {
      
//       item.status = 'Cancelled';
//       item.cancellationReasonTitle = reasonTitle;
//       item.cancellationReason = customReason || 'none';
//     } else if (actionType === 'return') {
//       item.status = 'Return Request';
//       item.cancellationReasonTitle = reasonTitle;
//       item.cancellationReason = customReason || 'none';
//     } else {
//       return res.status(400).json({ success: false, message: 'Invalid action type' });
//     }

//     await order.save();

//     // Get the variant index from the item
//     const variantIndex = item.variantIndex;
//     const variantPath = `variants.${variantIndex}.quantity`;

//     if(actionType === 'cancel'){
//       const productId = item.product;
//       const variantId = item.variantId;
//       // Update the stock of the correct variant
//       const product = await Product.findOneAndUpdate(
//         { _id: productId, 'variants._id': variantId },
//         { $inc: { 'variants.$.quantity': item.quantity } },
//         { new: true }
//       );
      
//       const updatedVariant = product?.variants.find(v => v._id.toString() === variantId.toString());
//       const updatedStock = updatedVariant?.quantity || 0;
      
//       // Emit updated stock info
//       const io = getIO();
//       io.emit('stock-update', {
//         productId: item.product.toString(),
//         variantId: variantId.toString(),
//         remainingStock: updatedStock,
//       });
//     }
    

//     res.json({
//       success: true,
//       message: `${actionType === 'cancel' ? 'Cancellation' : 'Return'} successful`,
//     });

//   } catch (error) {
//     console.error("Cancel/Return error:", error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// };

const handleOrderOrItemAction = async (req, res) => {
  try {
    const { orderId, itemId, action, type, reasonTitle, reason } = req.body;
    console.log(orderId, itemId, action, type, reasonTitle, reason);

    if (!orderId || !action || !type || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required data' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (type === 'order') {
      // Prevent duplicate action
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

            // Update product stock
            await Product.findOneAndUpdate(
              { _id: item.product, 'variants._id': item.variantId },
              { $inc: { 'variants.$.quantity': item.quantity } }
            );
          }
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
      // Find and update only the selected item
      const item = order.orderitems.id(itemId);
      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found in order' });
      }

      if (action === 'cancel') {
        item.status = 'Cancelled';
        item.cancellationReasonTitle = reasonTitle;
        item.cancellationReason = reason;

        // Update stock for cancelled item
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

      // Auto-update overall order status if all items share same status
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

    res.json({ success: true, message: `${action === 'cancel' ? 'Cancellation' : 'Return'} successful` });

  } catch (error) {
    console.error('Action handler error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};









module.exports = {
    loadOrderSuccess,
    loadOrderpage,
    orderDetails,
    handleOrderOrItemAction,
    //cancelOrReturnOrderItem,
}