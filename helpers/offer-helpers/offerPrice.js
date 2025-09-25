// helpers/offerUpdater.js
const Product = require('../../model/productSchema');
const Offer = require('../../model/offerSchema');

async function applyBestOffersToAllProducts() {
  const products = await Product.find().populate('category');
  const condition = { status: 'active', isListed: true };

  for (let product of products) {
    // Find offers once for this product
    const productOffer = await Offer.findOne({ ...condition, type: 'Product', targetId: product._id });
    const categoryOffer = await Offer.findOne({ ...condition, type: 'Category', targetId: product.category._id });

    product.variants = product.variants.map(variant => {
      if (!variant) return variant;
      const basePrice = variant.salePrice || variant.regularPrice;

      const variantOffer = 0;
      const productLevelOffer = productOffer ? productOffer.offerPercentage : 0;
      const categoryLevelOffer = categoryOffer ? categoryOffer.offerPercentage : 0;

      const bestOfferPercentage = Math.max(variantOffer, productLevelOffer, categoryLevelOffer);

      const finalPrice = bestOfferPercentage > 0
        ? basePrice - (basePrice * bestOfferPercentage / 100)
        : basePrice;

      return {
        ...variant.toObject(),
        finalPrice,
        offerPercentage: bestOfferPercentage
      };
    });

    await product.save();
  }

  console.log("Offers applied to all products");
}

module.exports = { applyBestOffersToAllProducts };
