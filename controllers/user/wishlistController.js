const User = require('../../model/userSchema');
const Wishlist = require('../../model/wishlistSchema');


const managewishlist =async(req,res)=>{
    try {
    const userId = req.session.userId || req.session.user?._id;

    const userData = await User.findOne({ _id: userId, isBlocked: false });
    const wishlist = await Wishlist.findOne({ userId })
      .populate({path: 'products.productId',populate: {path: 'category',model: 'Category'}
  });

    if (!wishlist || wishlist.products.length === 0) {
      return res.render('wishlist', {user:userData,wishlistItems: [] });
    }

    // Flatten to pass to EJS
     const wishlistItems = wishlist.products.map(item => {
      const product = item.productId;
      const variantId = item.variantId;

      const variant = product.variants?.find(v => v._id.toString() === variantId?.toString());
      console.log('v',variant)

      return {
        product,
        variant,
        addedOn: item.addedOn
      };
    });

    res.render('wishlist', {user:userData,wishlistItems });
  } catch (err) {
    console.error('Error fetching wishlist:', err);
    res.status(500).send('Server error');
  }
}

const addToWishlist = async (req, res) => {
  const userId = req.session.userId || req.session.user?._id;
  const { productId, variantId } = req.body;

  try {
    let user = await User.findById(userId)
    if(!user) return res.status(200).json({ success: false, message: 'Please signIn to add to wishlist' })
    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        products: [{ productId, variantId  }],
      });
    } else {
      const alreadyExists = wishlist.products.some(
        (p) =>
          p.productId.toString() === productId &&
          p.variantId.toString() === variantId
      );

      if (alreadyExists) {
        return res
          .status(200)
          .json({ success: false, message: 'Product already in wishlist' });
      }

      wishlist.products.push({ productId, variantId });
    }

    await wishlist.save();
    res.json({ success: true, message: 'Added to wishlist' });
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ success: false, message: 'Server error' });
  }
};

const removeFromWishlist = async (req, res) => {
  const userId = req.session.userId || req.session.user?._id;
  const { productId, variantId } = req.body;
  console.log(userId)

  try {
    const wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: 'Wishlist not found' });
    }

    const originalLength = wishlist.products.length;

    wishlist.products = wishlist.products.filter(
      p => !(
        p.productId.toString() === productId &&
        p.variantId.toString() === variantId
      )
    );

    if (wishlist.products.length === originalLength) {
      return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
    }

    await wishlist.save();

    res.json({ success: true, message: 'Removed from wishlist' });
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


module.exports = {
    managewishlist,
    addToWishlist,
    removeFromWishlist
}