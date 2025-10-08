const User = require('../../model/userSchema');
const Product = require('../../model/productSchema');
const Cart = require('../../model/cartSchema');
const Address = require('../../model/addressSchema');
const Order = require('../../model/orderSchema');
const Wallet = require('../../model/walletSchema')
const Coupon = require('../../model/couponSchema');
const razorpay = require('../../config/razorpay');
const crypto = require("crypto");
const { getIO } = require('../../config/socket'); //for getting socket IO


const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;

    // Fetch user and ensure not blocked
    const userData = await User.findOne({ _id: userId, isBlocked: false });
    if (!userData) {
      return res.status(403).send("Access denied or user not found");
    }

    // Fetch cart and populate products
    const cart = await Cart.findOne({ userId }).populate('items.productid');

    if (!cart || !cart.items.length) {
      return res.redirect('/cart'); 
    }

    // Fetch user addresses
    const addressDoc = await Address.findOne({ userId });


    // Calculate total price from cart items
    let totalPrice = 0
    let processedCartItems = []

    if (cart && cart.items.length > 0) {
     
      processedCartItems = cart.items
      .map((item) => {
        const product = item.productid;

        if (!product || !product.variants || !item.variantId) {
          console.error("Product or variant not found:", {
            productId: item.productid,
            variantId: item.variantId,
          });
          return null;
        }

        const variant = product.variants.find(
          (v) => v._id.toString() === item.variantId.toString()
        );

        if (!variant) {
          console.error("Variant not found for variantId:", item.variantId);
          return null;
        }

        const finalPrice = variant.finalPrice;
        const totalPrice = finalPrice * item.quantity;

        return {
          _id: item._id,
          productid: product,
          variantId: item.variantId,
          quantity: item.quantity,
          finalPrice: finalPrice,
          totalPrice: totalPrice,
          variant: variant,
          isOutOfStock: variant.quantity === 0||product.isBlocked===true,
          isLowStock: variant.quantity > 0 && variant.quantity <= 5,
          canIncreaseQuantity: item.quantity < variant.quantity,
          remainingStock: variant.quantity,
          stockLeft: variant.quantity - item.quantity,
        };
      })
      .filter((item) => item !== null);
    }

    // Filter out of stock items for order summary calculations
    const inStockItems = processedCartItems.filter((item) => {
      const variant = item.variant
      return variant && variant.quantity >= 1 && !item.isOutOfStock
    })


    // Calculate totals for in-stock items
    let inStockSubtotal = 0
    let inStockQuantity = 0
    inStockItems.forEach((item) => {
      const variantPrice = item.variant?.finalPrice || 0;
      inStockSubtotal += variantPrice * item.quantity;
      inStockQuantity += item.quantity;
    });
    if(inStockItems<1){
      return res.redirect('/cart');
    }

    // Fetch All Available coupons for user
    const now = new Date();

    // Find coupons that are active and listed
    let coupons = await Coupon.find({
      startOn: { $lte: now },
      expireOn: { $gte: now },
      isList: true,
      minimumPrice: { $lte: inStockSubtotal },
      $or: [
        { assignedTo: null }, // general coupons (global coupon)
        { assignedTo: userId } // coupons assigned to this user
      ]
    });

    // Filter based on per-user usage
    coupons = coupons.filter(coupon => {
      const userUsage = coupon.usedBy.find(u => u.user.toString() === userId.toString());
      if (!userUsage) return true; // never used
      return userUsage.count < coupon.usageLimit; // within limit
    });
    
    


    // Calculate charges based on in-stock items only
    const inStockDeliveryCharge = inStockSubtotal >= 5000 ? 0 : 70
    const inStockDiscount = 0 
    const inStockFinalAmount = inStockSubtotal + inStockDeliveryCharge - inStockDiscount



    res.render('checkout', {
      user: userData,
      userAddress: addressDoc,
      cartItems:inStockItems,
      totalPrice:inStockSubtotal,
      deliveryCharge:inStockDeliveryCharge,
      discount:inStockDiscount,
      finalAmount:inStockFinalAmount,
      coupons
    });

  } catch (error) {
    console.error('Checkout page load error:', error);
    res.status(500).send("Something went wrong while loading the checkout page.");
  }
};

const checkoutHandler = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const allowedMethods = ['COD', 'Wallet', 'UPI', 'Card'];

    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }
    if (paymentMethod === 'COD') {
      // Create and save the order immediately
      return handleCOD(req, res);
    } else if (paymentMethod==='Wallet'){
      // Deduct amount from wallet and place order
      return handleWalletPayment(req,res)
    }else if(['UPI','Card'].includes(paymentMethod)){
      // Prepare for Razorpay or other payment
      return handleOnlinePaymentInit(req, res);
    }
  } catch (error) {
    console.error("Checkout error:", error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

const handleWalletPayment = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    const { addressId, couponId } = req.body;

    // Fetch user, cart, and address
    const userData = await User.findOne({ _id: userId, isBlocked: false });
    const cart = await Cart.findOne({ userId }).populate('items.productid');
    const addressDoc = await Address.findOne({ userId });

    if (!userData || !cart || !addressDoc) {
      return res.json({ success: false, message: 'User, cart, or address not found' });
    }

    const selectedAddress = addressDoc.address.find(addr => addr._id.equals(addressId));
    if (!selectedAddress) {
      return res.json({ success: false, message: 'Invalid address ID' });
    }

    const cartItems = cart.items;
    if (!cartItems.length) {
      return res.json({ success: false, message: 'Cart is empty' });
    }

    // Filter only in-stock items with variants
    const inStockItems = [];
    cartItems.forEach(item => {
      const product = item.productid;
      if (!product || product.isBlocked || !product.variants || !item.variantId) return;

      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
      if (variant && variant.quantity >= item.quantity) {
        inStockItems.push({
          ...item.toObject(),
          variant,
          finalPrice: variant.finalPrice,
          totalPrice: variant.finalPrice * item.quantity
        });
      }
    });

    if (!inStockItems.length) {
      return res.json({ success: false, message: 'All items are out of stock' });
    }

    // Calculate totals
    let totalPrice = 0;
    inStockItems.forEach(item => totalPrice += item.totalPrice);
    const deliveryCharge = totalPrice >= 5000 ? 0 : 70;

    // Coupon handling
    let couponDiscount = 0, couponApplied = false, couponCode = null;
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      const now = new Date();
      if (
        coupon &&
        coupon.startOn <= now &&
        coupon.expireOn >= now &&
        coupon.isList &&
        coupon.minimumPrice <= totalPrice
      ) {
        const userUsage = coupon.usedBy.find(u => u.user.toString() === userId.toString());
        if (!userUsage || userUsage.count < coupon.usageLimit) {
          couponDiscount = coupon.offerPrice;
          couponApplied = true;
          couponCode = coupon.name;
          if (!userUsage) {
            coupon.usedBy.push({ user: userId, count: 1 });
          } else {
            userUsage.count += 1;
          }
          await coupon.save();
        }
      }
    }

    const finalAmount = totalPrice + deliveryCharge - couponDiscount;

    // Fetch wallet
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(400).json({ success: false, message: 'Wallet not found' });
    }

    // Check wallet balance
    if (wallet.balance < finalAmount) {
      return res.json({ success: false, message: 'Insufficient wallet balance' });
    }

    // Create order first
    const order = new Order({
      user: userId,
      orderitems: inStockItems.map(item => ({
        product: item.productid._id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.finalPrice,
        status: 'Processing'
      })),
      totalPrice,
      couponDiscount,
      finalAmount,
      shippingCharge: deliveryCharge,
      shippingAddress: { ...selectedAddress },
      paymentMethod: 'Wallet',
      paymentStatus: 'paid',
      orderStatus: 'Processing',
      couponApplied,
      couponCode
    });

    const updatedOrder = await order.save();

    if (!updatedOrder) {
      return res.json({ success: false, message: 'Failed to place order from wallet' });
    }

    // Deduct wallet balance & add transaction
    wallet.balance -= finalAmount;
    wallet.transactions.push({
      type: 'debit',
      amount: finalAmount,
      paymentMethod: 'Wallet',
      reference: updatedOrder._id.toString(),
      description: `Payment for order ${updatedOrder._id.toString()}`
    });
    await wallet.save();

    const io = getIO();

    // Update stock
    for (const item of inStockItems) {
      const product = await Product.findById(item.productid._id);
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
      if (variant && variant.quantity >= item.quantity) {
        variant.quantity -= item.quantity;
        await product.save();
        io.emit('stock-update', {
          productId: product._id.toString(),
          variantId: variant._id,
          remainingStock: variant.quantity
        });
      }
    }

    // Remove ordered items from cart
    cart.items = cart.items.filter(cartItem =>
      !inStockItems.some(orderedItem =>
        orderedItem.productid._id.equals(cartItem.productid._id) &&
        orderedItem.variantId.toString() === cartItem.variantId.toString()
      )
    );
    await cart.save();
    return res.json({ success: true, orderId: updatedOrder._id });
  } catch (error) {
    console.error("Wallet payment error:", error);
    res.status(500).json({ success: false, message: 'Something went wrong during wallet payment' });
  }
};



const handleCOD = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    const { addressId,couponId } = req.body;

    const userData = await User.findOne({ _id: userId, isBlocked: false });
    const cart = await Cart.findOne({ userId }).populate('items.productid');
    const addressDoc = await Address.findOne({ userId });

    if (!userData || !cart || !addressDoc) {
      return res.json({ success: false, message: 'User, cart, or address not found' });
    }

    const selectedAddress = addressDoc.address.find(addr => addr._id.equals(addressId));
    if (!selectedAddress) {
      return res.json({ success: false, message: 'Invalid address ID' });
    }

    const cartItems = cart.items;
    if (!cartItems.length) {
      return res.json({ success: false, message: 'Cart is empty' });
    }

     // Filter only in-stock items witth variants
    const inStockItems = [];

    cartItems.forEach(item => {
      const product = item.productid;
      if (!product || product.isBlocked || !product.variants || !item.variantId) return;

      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      if (variant && variant.quantity >= item.quantity) {
        const finalPrice = variant.finalPrice;
        const quantity = item.quantity;
        const totalPrice = finalPrice * quantity;

        inStockItems.push({
          ...item.toObject(),
          variant,
          finalPrice,
          totalPrice
        });
      }
    });

    if (!inStockItems.length) {
      return res.json({ success: false, message: 'All items are out of stock' });
    }

    // Calculate totals of in-stock only
    let totalPrice = 0;
    inStockItems.forEach(item => {
      totalPrice += item.totalPrice;
    });
    
    if(totalPrice>25000) return res.status(400).json({ success: false, message: 'COD orders cannot exceed ₹25,000' });

    const deliveryCharge = totalPrice >= 5000 ? 0 : 70;


    let couponDiscount = 0;
    let couponApplied = false;
    let couponCode = null;

    // Coupon Handling
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      const now = new Date();

      if (
        coupon &&
        coupon.startOn <= now &&
        coupon.expireOn >= now &&
        coupon.isList &&
        coupon.minimumPrice <= totalPrice
      ) {
        // Check user usage
        const userUsage = coupon.usedBy.find(u => u.user.toString() === userId.toString());
        if (!userUsage || userUsage.count < coupon.usageLimit) {
          couponDiscount = coupon.offerPrice;
          couponApplied = true;
          couponCode = coupon.name;

          // update coupon usage
          if (!userUsage) {
            coupon.usedBy.push({ user: userId, count: 1 });
          } else {
            userUsage.count += 1;
          }
          await coupon.save();
        }
      }
    }

    const finalAmount = totalPrice + deliveryCharge - couponDiscount;

    // Create the order using only in-stock items
    const order = new Order({
      user: userId,
      orderitems: inStockItems.map(item => ({
        product: item.productid._id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.finalPrice,
      })),
      totalPrice,
      couponDiscount,
      finalAmount,
      shippingCharge:deliveryCharge,
      shippingAddress: { ...selectedAddress },
      paymentMethod: 'COD',
      couponApplied,
      couponCode
    });

    const updatedOrder = await order.save();

    if (updatedOrder) {
      const io = getIO();

      // Update product stock
      for (const item of inStockItems) {
      const product = await Product.findById(item.productid._id);
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

      if (variant && variant.quantity >= item.quantity) {
        variant.quantity -= item.quantity;
        await product.save();

        const io = getIO();
        io.emit('stock-update', {
          productId: product._id.toString(),
          variantId: variant._id,
          remainingStock: variant.quantity
        });
      } else {
        console.warn(`Stock update skipped: variant not found or insufficient stock (Product: ${item.productid._id})`);
      }
    }

    console.log('c',cart.items)
    console.log('IN',inStockItems)
      // Remove only the in-stock ordered items from cart
      cart.items = cart.items.filter(cartItem => {
        return !inStockItems.some(orderedItem =>
          orderedItem.productid._id.equals(cartItem.productid._id) &&
          orderedItem.variantId.toString() === cartItem.variantId.toString()
        );
      });

      await cart.save();

      return res.json({ success: true, orderId: updatedOrder._id });
    }

    res.json({ success: false, message: "Failed to place your order, please try again." });

  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ success: false, message: 'Something went wrong during checkout' });
  }
};

const handleOnlinePaymentInit = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    const { addressId,couponId } = req.body;

    const userData = await User.findOne({ _id: userId, isBlocked: false });
    const cart = await Cart.findOne({ userId }).populate('items.productid');
    const addressDoc = await Address.findOne({ userId });

    if (!userData || !cart || !addressDoc) {
      return res.json({ success: false, message: 'User, cart, or address not found' });
    }

    const selectedAddress = addressDoc.address.find(addr => addr._id.equals(addressId));
    if (!selectedAddress) {
      return res.json({ success: false, message: 'Invalid address ID' });
    }

    const cartItems = cart.items;
    if (!cartItems.length) {
      return res.json({ success: false, message: 'Cart is empty' });
    }

    // Filter only in-stock items
    const inStockItems = [];

    cartItems.forEach(item => {
      const product = item.productid;
      if (!product || !product.variants || !item.variantId) return;

      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      if (variant && variant.quantity >= item.quantity) {
        inStockItems.push({ ...item.toObject(), variant });
      }
    });

    if (!inStockItems.length) {
      return res.json({ success: false, message: 'All items are out of stock' });
    }

    // Calculate totals
    let totalPrice = 0;
    inStockItems.forEach(item => {
      const price = item.variant.finalPrice;
      totalPrice += price * item.quantity;
    });


    const deliveryCharge = totalPrice >= 5000 ? 0 : 70;


    // Coupon of a specific user
    let couponDiscount = 0;
    let couponApplied = false;
    let couponCode = null;

    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      const now = new Date();

      if (
        coupon &&
        coupon.startOn <= now &&
        coupon.expireOn >= now &&
        coupon.isList &&
        coupon.minimumPrice <= totalPrice
      ) {
        couponDiscount = coupon.offerPrice;
        couponApplied = true;
        couponCode = coupon.name;
      }
    }


    let finalAmount = totalPrice + deliveryCharge - couponDiscount;
    

    // Create Razorpay order
    const options = {
      amount: finalAmount * 100, // in paise
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };


    const razorpayOrder = await razorpay.orders.create(options);

    return res.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
      finalAmount,
      message: "Razorpay order created successfully"
    });

  } catch (error) {
    console.error("Online Payment Init Error:", error);
    return res.status(500).json({ success: false, message: "Something went wrong during payment init" });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      addressId,
      paymentMethod,
      couponId,
      finalAmount
    } = req.body;

    const userId = req.session.userId || req.session.user?._id;

    const userData = await User.findOne({ _id: userId, isBlocked: false });
    const cart = await Cart.findOne({ userId }).populate("items.productid");
    const addressDoc = await Address.findOne({ userId });

    if (!userData || !cart || !addressDoc) {
      return res.json({ success: false, message: "User, cart, or address not found" });
    }

    const selectedAddress = addressDoc.address.find(addr => addr._id.equals(addressId));
    if (!selectedAddress) {
      return res.json({ success: false, message: "Invalid address ID" });
    }

    const cartItems = cart.items;
    const inStockItems = [];
    cartItems.forEach(item => {
      const product = item.productid;
      if (!product || !product.variants || !item.variantId) return;
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
      if (variant && variant.quantity >= item.quantity) {
        inStockItems.push({ ...item.toObject(), variant });
      }
    });

    if (!inStockItems.length) {
      return res.json({ success: false, message: "All items are out of stock" });
    }

    // Calculate totals
    let totalPrice = 0;
    inStockItems.forEach(item => {
      totalPrice += item.variant.finalPrice * item.quantity;
    });

    const deliveryCharge = totalPrice >= 5000 ? 0 : 70;

    // Coupon handling
    let couponDiscount = 0, couponApplied = false, couponCode = null;
    if (couponId) {
      const coupon = await Coupon.findById(couponId);
      const now = new Date();
      if (
        coupon &&
        coupon.startOn <= now &&
        coupon.expireOn >= now &&
        coupon.isList &&
        coupon.minimumPrice <= totalPrice
      ) {
        couponDiscount = coupon.offerPrice;
        couponApplied = true;
        couponCode = coupon.name;
      }
    }

    const finalAmountCalculated = totalPrice + deliveryCharge - couponDiscount;

    // failed order
    let paymentStatus = "failed";
    let orderStatus = "Pending";
    let orderItemStatus = "Pending";

    // Verify signature (success only if matches)
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      paymentStatus = "paid";
      orderStatus = "Processing";
      orderItemStatus = "Processing";
    }

    // Create order (success or fail)
    const order = new Order({
      user: userId,
      orderitems: inStockItems.map(item => ({
        product: item.productid._id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.variant.finalPrice,
        status: orderItemStatus
      })),
      totalPrice,
      couponDiscount,
      finalAmount: finalAmountCalculated,
      shippingCharge: deliveryCharge,
      shippingAddress: { ...selectedAddress },
      paymentMethod,
      paymentStatus,
      orderStatus,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id || null,
      couponApplied,
      couponCode
    });

    const savedOrder = await order.save();

    if (paymentStatus === "paid") {
      // Decrease stock only if payment successful
      for (const item of inStockItems) {
        const product = await Product.findById(item.productid._id);
        const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());
        if (variant && variant.quantity >= item.quantity) {
          variant.quantity -= item.quantity;
          await product.save();
          getIO().emit("stock-update", {
            productId: product._id.toString(),
            variantId: variant._id,
            remainingStock: variant.quantity
          });
        }
      }

      // Remove from cart
      cart.items = cart.items.filter(cartItem => {
        return !inStockItems.some(orderedItem =>
          orderedItem.productid._id.equals(cartItem.productid._id) &&
          orderedItem.variantId.toString() === cartItem.variantId.toString()
        );
      });
      await cart.save();

      return res.json({ success: true, orderId: savedOrder._id, redirect: "/order/success" });
    } else {
      // Payment failed → no stock update, no cart clear
      return res.json({ success: false, orderId: savedOrder._id, redirect: "/order/failure" });
    }
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ success: false, message: "Server error during verification" });
  }
};



module.exports = {
    loadCheckoutPage,
    checkoutHandler,
    verifyPayment
}