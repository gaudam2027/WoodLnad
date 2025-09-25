async function getActiveOffer(product) {
    const now = new Date();

    // Check product-level offer
    let productOffer = 0;
    if (product.isOfferActive && now >= product.offerStartDate && now <= product.offerEndDate) {
        productOffer = product.offerPercentage;
    }

    // Fetch active category offer from CategoryOffer collection
    const categoryOfferDoc = await CategoryOffer.findOne({
        categoryId: product.category,
        status: 'active',
        startDate: { $lte: now },
        endDate: { $gte: now }
    });

    const categoryOffer = categoryOfferDoc?.offerPercentage || 0;

    return Math.max(productOffer, categoryOffer);
}
