const User = require('../../model/userSchema');
const Cart = require('../../model/cartSchema');
const Product = require('../../model/productSchema');
const Category = require('../../model/categorySchema');
const { getIO } = require('../../config/socket'); //for getting socket IO

const managecart = async (req, res) => {
  try {
    const user = req.session.userId || req.session.user?._id;
    const userData = await User.findOne({ _id: user, isBlocked: false });

    const cart = await Cart.findOne({ userId: userData._id }).populate({
      path: "items.productid",
      model: "Product",
    });

    let processedCartItems = [];

    if (cart && cart.items.length > 0) {
        processedCartItems = cart.items
          .map((item) => {
            const product = item.productid;
            if (!product || !product.variants || !item.variantId) return null;

            const variant = product.variants.find(
              (v) => v._id.toString() === item.variantId.toString()
            );
            if (!variant) return null;

            const finalPrice = variant.finalPrice || variant.salePrice || variant.regularPrice;
            const totalPrice = finalPrice * item.quantity;
            console.log(typeof finalPrice)

            return {
              _id: item._id,
              productid: product,
              variantId: item.variantId,
              quantity: item.quantity,
              finalPrice,
              totalPrice,
              variant,
              isOutOfStock: variant.quantity === 0 || product.isBlocked,
              isLowStock: variant.quantity > 0 && variant.quantity <= 5,
              canIncreaseQuantity: item.quantity < variant.quantity,
              remainingStock: variant.quantity,
              stockLeft: variant.quantity - item.quantity,
            };
          })
          .filter((item) => item !== null);

    }

    const inStockItems = processedCartItems.filter((item) => {
      const variant = item.variant;
      return variant && variant.quantity >= item.quantity && !item.isOutOfStock;
    });

    let inStockSubtotal = 0;
    let inStockQuantity = 0;

    inStockItems.forEach((item) => {
      inStockSubtotal += item.finalPrice * item.quantity; 
      inStockQuantity += item.quantity;
    });

    const inStockDeliveryCharge = inStockSubtotal >= 5000 ? 0 : 70;
    const inStockDiscount = 0;
    const inStockFinalAmount = inStockSubtotal + inStockDeliveryCharge - inStockDiscount;

    res.render("myCart", {
      user: userData,
      cartItems: processedCartItems,
      inStockItems,
      inStockSubtotal,
      inStockQuantity,
      inStockDeliveryCharge,
      inStockDiscount,
      inStockFinalAmount,
    });

  } catch (error) {
    console.log("myCart page error:", error);
    res.status(500).send("Server error");
  }
};




const addCart = async (req, res) => {
  try {
    const user = req.session.userId || req.session.user?._id;
    if (!user) {
      return res.status(400).json({ user: false, message: 'Please login to add to cart!' });
    }

    const productId = req.params.id;
    const quantityToAdd = parseInt(req.body.quantity) || 1;
    const variantId = req.body.variantId;
    console.log(variantId)



    if (!variantId) {
      return res.status(400).json({ message: 'Variant not selected' });
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Product not found');

    // Find the selected variant using variantId
    const variant = product.variants.find(v => v._id.toString() === variantId);
    if (!variant) {
      return res.status(400).json({ message: 'Invalid variant selected' });
    }

    const availableStock = variant.quantity;
    const price = variant.finalPrice;
    const totalPriceToAdd = price * quantityToAdd;

    let cart = await Cart.findOne({ userId: user });
    if (!cart) {
      cart = new Cart({ userId: user, items: [] });
    }

    // Find existing cart item by productId and variantId
    const existingItemIndex = cart.items.findIndex(
      item => item.productid.toString() === productId && item.variantId.toString() === variantId
    );

    let existingQty = 0;
    if (existingItemIndex !== -1) {
      existingQty = cart.items[existingItemIndex].quantity;
    }

    const totalRequested = existingQty + quantityToAdd;

    // Check against stock
    if (totalRequested > availableStock) {
      let remainingStock = availableStock - existingQty;
      return res.status(400).json({
        message: remainingStock > 0
          ? `Only ${remainingStock} more item(s) available in stock.`
          : 'Item is out of stock'
      });
    }

    // Update cart
    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity = totalRequested;
      cart.items[existingItemIndex].totalPrice = totalRequested * price;
    } else {
      cart.items.push({
        productid: productId,
        variantId,
        quantity: quantityToAdd,
        // salePrice: price,
        // totalPrice: totalPriceToAdd,
      });
    }

    await cart.save();

    return res.status(200).json({
      success:true,
      message: 'Product added to cart successfully!',
      cartItemCount: cart.items.length,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error adding to cart' });
  }
};




const updateCartQuantity = async (req, res) => {
  try {
    const { quantity } = req.body;
    const itemId = req.params.id;
    const userId = req.session.userId || req.session.user?._id;

    const cart = await Cart.findOne({ userId }).populate({
      path: "items.productid",
      model: "Product",
    });

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    const cartItem = cart.items.id(itemId);
    console.log(cartItem)
    if (!cartItem) {
      return res.json({ success: false, message: "Item not found in cart" });
    }

    const product = cartItem.productid;
    if (!product || !product.variants || !cartItem.variantId) {
      return res.json({ success: false, message: "Variant data missing" });
    }

    const variant = product.variants.find(
      (v) => v._id.toString() === cartItem.variantId.toString()
    );
    


    if (!variant) {
      return res.json({ success: false, message: "Variant not found in product" });
    }

    // Validate quantity
    if (quantity < 1) {
      return res.json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    if (quantity > variant.quantity && quantity > cartItem.quantity) {
      return res.json({
        success: false,
        message: `Only ${variant.quantity} items available in stock`,
      });
    }

    // Update quantity and total price
    cartItem.quantity = quantity;
    cartItem.totalPrice = quantity * variant.finalPrice;
    

    await cart.save();

    // Recalculate in-stock total
    let updatedCartTotal = 0;
    cart.items.forEach((item) => {
      const itemVariant = item.productid.variants.find(
        (v) => v._id.toString() === item.variantId.toString()
      );

      if (itemVariant && itemVariant.quantity >= 1) {
        updatedCartTotal += item.quantity * itemVariant.finalPrice;
      }
    });

    const deliveryCharge = updatedCartTotal >= 5000 ? 0 : 70;
    const discount = 0;
    const finalAmount = updatedCartTotal + deliveryCharge - discount;

    res.json({
      success: true,
      updatedTotal: cartItem.totalPrice,
      
      updatedCartTotal,
      finalAmount,
      remainingStock: variant.quantity,
      stockLeft: variant.quantity - quantity,
      salePrice: variant.salePrice,
      inStockOnly: true,
    });

  } catch (error) {
    console.error("Cart update error:", error);
    res.json({ success: false, message: "Server error occurred" });
  }
};





const deleteCartItem = async(req,res)=>{
    try {      
    const itemId = req.params.id;
    const user = req.session.userId || req.session.user?._id
    console.log('yritm',itemId)
    console.log('id',user)

    // Remove item from user's cart in DB
    const deletedItem = await Cart.updateOne(
      { userId:user },
      { $pull: { items: { _id: itemId } } }
    );

    if(!deletedItem){
       return res.json({success: false});
    }

    res.json({success:true});
  } catch (err) {
    res.status(500).json({ success: false, message: 'Something went wrong' });
  }
}



module.exports = {
    managecart,
    addCart,
    updateCartQuantity,
    deleteCartItem
}