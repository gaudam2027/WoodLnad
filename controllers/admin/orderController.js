const User = require('../../model/userSchema');
const Order = require('../../model/orderSchema');
const Product = require('../../model/productSchema');
const Wallet = require('../../model/walletSchema');
const { calculateOrderStatus } = require('../../helpers/orderStatusHelper');
const {calculateRefundAmount} = require('../../helpers/cuponDiscoundRefund')


const manageOrder = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 10
    const search = req.query.search || ""
    const statusFilter = req.query.status || ""
    const sortBy = req.query.sort || "date-desc"

    console.log("Status Filter:", statusFilter,search)

    const query = {}

    // If search term exists
    if (search) {
      const users = await User.find({
        $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }],
      }).select("_id")

      const userIds = users.map((user) => user._id)

      // Fix: should be 'user' not 'orderitems.user'
      query.$or = [
        { user: { $in: userIds } },
        { orderId: { $regex: search, $options: "i" } }, // Also search by order ID
      ]
    }

    // Filter by status if provided
    if (statusFilter) {
      query.orderStatus = statusFilter
    }

    // Determine sort order
    let sortOption = {}
    switch (sortBy) {
      case "date-asc":
        sortOption = { createdOn: 1 }
        break
      case "total-desc":
        sortOption = { finalAmount: -1 }
        break
      case "total-asc":
        sortOption = { finalAmount: 1 }
        break
      case "date-desc":
      default:
        sortOption = { createdOn: -1 }
        break
    }

    // Count total documents for pagination
    const totalOrders = await Order.countDocuments(query)

    // Fetch paginated orders
    const orders = await Order.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email phone") // populate user details
      .populate("orderitems.product", "productName images") // populate product details
      .lean()
      
      
    // total delivery charges
    const totalDeliveryCharge = orders.reduce((sum,order)=>{
      const totalPrice = order.orderitems.reduce((acc,item)=>{
        if(item.status !== 'Returned' && item.status !== 'Cancelled'){
          acc+=(item.price-item.discount)
        }
        return acc
      },0);
      sum+=(totalPrice < 10000 && totalPrice!=0  ? 50:0);
      return sum
    },0)


    res.render("orderManagement", {
      title: "Manage Orders",
      orders,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      searchQuery: search,
      statusFilter,
      sortBy,
      totalDeliveryCharge
    })
  } catch (error) {
    console.error("Error in manageOrder:", error)
    res.status(500).render("admin/error", {
      title: "Error",
      message: "Failed to load order management",
    })
  }
}

const statusUpdate = async (req, res) => {
  try {
    const { orderId, itemId, newStatus } = req.body;

    if (!orderId || !newStatus) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const validTransitions = {
      Pending: ['Ordered', 'Cancelled'],
      Ordered: ['Shipped', 'Cancelled'],
      Shipped: ['Out For Delivery'],
      'Out For Delivery': ['Delivered'],
      Delivered: [],
      Cancelled: [],
      'Return Request': [],
      Returned: [],
    };

    if (!itemId) {
      const currentStatus = order.orderStatus;

      if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
        return res.status(400).json({
          message: `Invalid transition from ${currentStatus} to ${newStatus}`
        });
      }

      const invalidItems = order.orderitems.filter(item => {
        if (item.status === 'Cancelled') return false;
        const validItemTransitions = validTransitions[item.status] || [];
        return !validItemTransitions.includes(newStatus);
      });

      if (invalidItems.length > 0) {
        return res.status(400).json({
          message: `Cannot update order. Some items cannot transition to ${newStatus}`
        });
      }

      order.orderStatus = newStatus;

      for (const item of order.orderitems) {
        if (item.status !== 'Cancelled') {
          item.status = newStatus;

          if (newStatus === 'Cancelled') {
            await Product.findOneAndUpdate(
              { 'variants._id': item.variantId },
              { $inc: { 'variants.$.quantity': item.quantity } }
            );
          }
        }
      }

      if (order.orderStatus == 'Delivered') order.paymentStatus = 'paid';
      await order.save();
      return res.status(200).json({ success: true, message: 'Order and items updated' });
    }else{

       const item = order.orderitems.find(i => i._id.toString() === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const currentStatus = item.status;
    const allowedNext = validTransitions[currentStatus] || [];

    if (currentStatus !== newStatus && !allowedNext.includes(newStatus)) {
      return res.status(400).json({ error: `Invalid transition from ${currentStatus} to ${newStatus}` });
    }

    item.status = newStatus;

    if (newStatus === 'Cancelled') {
      await Product.findOneAndUpdate(
        { 'variants._id': item.variantId },
        { $inc: { 'variants.$.quantity': item.quantity } }
      );
    }

    
    order.orderStatus = calculateOrderStatus(order.orderitems, order.orderStatus);


    await order.save();

    res.json({ success: true, message: 'Status updated successfully' });
    }

   

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const verifyReturn = async (req, res) => {
  const { orderId, itemId, action } = req.body;

  try {
    const order = await Order.findById(orderId).populate('user');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const handleRefund = async (items) => {
      // Restock products
      for (const item of items) {
        const product = await Product.findById(item.product);
        const variant = product?.variants.find(
          v => v._id.toString() === item.variantId?.toString()
        );
        if (variant) {
          variant.quantity += item.quantity;
          await product.save();
        }
      }

      // Calculate refund using helper
      const refundAmount = calculateRefundAmount(order, items);

      let wallet = await Wallet.findOne({ user: order.user._id });
      if (!wallet) {
        wallet = new Wallet({
          user: order.user._id,
          balance: 0,
          transactions: [],
        });
      }

      wallet.balance += refundAmount;
      wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        reference: `refund_${order._id}_${items.map(i => i._id).join('_')}`,
        description: 'Refund for returned item(s)',
      });

      await wallet.save();
    };

    // === Full Order Return ===
    if (!itemId) {
      const itemsToReturn = order.orderitems.filter(i => i.status === 'Return Request');

      if (itemsToReturn.length === 0) {
        return res.json({ success: false, message: 'No items in return request' });
      }

      if (action === 'accept') {
        for (const item of itemsToReturn) {
          item.status = 'Returned';
        }
        await handleRefund(itemsToReturn);
      } else {
        for (const item of itemsToReturn) {
          item.status = 'Return Rejected';
          item.canRequestReturn = false;
          item.updatedAt = new Date();
        }
      }

      order.orderStatus = calculateOrderStatus(order.orderitems, order.orderStatus);
      await order.save();

      return res.json({
        success: true,
        message: action === 'accept'
          ? 'Items returned and refunded'
          : 'Return requests rejected'
      });
    }

    // === Single Item Return ===
    const item = order.orderitems.find(i => i._id.toString() === itemId);
    if (!item) {
      return res.status(400).json({ success: false, message: 'Invalid item ID' });
    }

    if (item.status !== 'Return Request') {
      return res.status(400).json({ success: false, message: 'Item not in return request' });
    }

    if (action === 'accept') {
      item.status = 'Returned';
      await handleRefund([item]); // pass as array
    } else {
      item.status = 'Return Rejected';
      item.canRequestReturn = false;
      item.updatedAt = new Date();
    }

    order.orderStatus = calculateOrderStatus(order.orderitems, order.orderStatus);
    await order.save();

    return res.json({
      success: true,
      message: action === 'accept'
        ? 'Item returned and refunded'
        : 'Return request rejected'
    });

  } catch (error) {
    console.error('Verify item return error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};




const orderDetials = async(req,res)=>{
  try {
    const orderDetialsId = req.params.id
    const order = await Order.findById(orderDetialsId).populate([{path: 'orderitems.product',populate: {path: 'category'}},{path:'user'}]).lean();

    if(!order){
      return res.status(404).render('404', { message: 'Order not found' });
    }

    res.render('order-Details',{
      order
    })
    
  } catch (error) {
    console.error('Error cannot get order details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}




module.exports={
    manageOrder,
    statusUpdate,
    verifyReturn,
    orderDetials
}