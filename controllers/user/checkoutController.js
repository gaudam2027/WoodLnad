const User = require('../../model/userSchema');
const Product = require('../../model/productSchema');
const Cart = require('../../model/cartSchema');
const Address = require('../../model/addressSchema');
const Order = require('../../model/orderSchema');
const razorpay = require('../../config/razorpay');
const crypto = require("crypto");
const { getIO } = require('../../config/socket'); //for getting socket IO


const loadCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    // if (!userId) {
    //   return res.redirect('/login'); 
    // }

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

        const salePrice = variant.salePrice;
        const totalPrice = salePrice * item.quantity;

        return {
          _id: item._id,
          productid: product,
          variantId: item.variantId,
          quantity: item.quantity,
          salePrice: salePrice,
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


    // Calculate totals for in-stock items only
    let inStockSubtotal = 0
    let inStockQuantity = 0
    inStockItems.forEach((item) => {
      const variantPrice = item.variant?.salePrice || 0;
      inStockSubtotal += variantPrice * item.quantity;
      inStockQuantity += item.quantity;
    });
    if(inStockItems<1){
      return res.redirect('/cart');
    }

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
    });

  } catch (error) {
    console.error('Checkout page load error:', error);
    res.status(500).send("Something went wrong while loading the checkout page.");
  }
};





const handleCOD = async (req, res) => {
  try {
    const userId = req.session.userId || req.session.user?._id;
    const { addressId } = req.body;

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
        const salePrice = variant.salePrice; // Or regular price if no sale
        const quantity = item.quantity;
        const totalPrice = salePrice * quantity;

        inStockItems.push({
          ...item.toObject(),
          variant,
          salePrice,
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

    const deliveryCharge = totalPrice >= 5000 ? 0 : 70;
    const discount = 0;
    const finalAmount = totalPrice + deliveryCharge - discount;

    // Create the order using only in-stock items
    const order = new Order({
      user: userId,
      orderitems: inStockItems.map(item => ({
        product: item.productid._id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.salePrice,
      })),
      totalPrice,
      discount,
      finalAmount,
      shippingAddress: { ...selectedAddress },
      paymentMethod: 'COD',
      couponApplied: false,
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
    const { addressId } = req.body;

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
      const price = item.variant.salePrice;
      totalPrice += price * item.quantity;
    });
    

    const deliveryCharge = totalPrice >= 5000 ? 0 : 70;
    const discount = 0;
    const finalAmount = totalPrice + deliveryCharge - discount;
    

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


const checkoutHandler = async (req, res) => {
  const { paymentMethod } = req.body;

  if (paymentMethod === 'COD') {
    // Create and save the order immediately
    return handleCOD(req, res);
  } else {
    // Prepare for Razorpay or other payment
    return handleOnlinePaymentInit(req, res);
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
      finalAmount
    } = req.body;

    // Verify signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    //Signature is valid — proceed to Stage 2: Order Placement
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

      const variant = product.variants.find(
        v => v._id.toString() === item.variantId.toString()
      );

      if (variant && variant.quantity >= item.quantity) {
        inStockItems.push({ ...item.toObject(), variant });
      }
    });

    if (!inStockItems.length) {
      return res.json({ success: false, message: "All items are out of stock" });
    }

    // Calculate total from in-stock items
    let totalPrice = 0;
    inStockItems.forEach(item => {
      totalPrice += item.totalPrice;
    });

    const deliveryCharge = totalPrice >= 5000 ? 0 : 70;
    const discount = 0;
    const finalAmountCalculated = totalPrice + deliveryCharge - discount;
    console.log(finalAmountCalculated,finalAmount)

    if (finalAmountCalculated !== finalAmount) {
      return res.json({ success: false, message: "Final amount mismatch" });
    }

    // Create order
    const order = new Order({
      user: userId,
      orderitems: inStockItems.map(item => ({
        product: item.productid._id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.salePrice
      })),
      totalPrice,
      discount,
      finalAmount,
      shippingAddress: { ...selectedAddress },
      paymentMethod,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      couponApplied: false
    });

    const updatedOrder = await order.save();

    // Update stock
    for (const item of inStockItems) {
      const product = await Product.findById(item.productid._id);
      const variant = product.variants.find(v => v._id.toString() === item.variantId.toString());

      if (variant && variant.quantity >= item.quantity) {
        variant.quantity -= item.quantity;
        await product.save();

        const io = getIO();
        io.emit("stock-update", {
          productId: product._id.toString(),
          variantId: variant._id,
          remainingStock: variant.quantity
        });
      }
    }

    // Clean cart
    cart.items = cart.items.filter(cartItem => {
      return !inStockItems.some(orderedItem =>
        orderedItem.productid._id.equals(cartItem.productid._id) &&
        orderedItem.variantId.toString() === cartItem.variantId.toString()
      );
    });

    await cart.save();

    return res.json({ success: true, orderId: updatedOrder._id });

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