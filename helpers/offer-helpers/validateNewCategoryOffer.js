const Offer = require("../../model/offerSchema");

/**
 * Validate if a new offer has any conflicting date ranges for the same target.
 *
 * @param {String} type - "Product" or "Category"
 * @param {String} targetId - productId or categoryId
 * @param {String|Date} startDate
 * @param {String|Date} endDate
 * @param {String|null} excludeOfferId - Offer ID to exclude (for edit mode)
 * @returns {Promise<string|null>} - HTML conflict message or null if no conflict
 */
async function validateNewOffer(type, targetId, startDate, endDate, excludeOfferId = null) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Base query: same type, same target, active or upcoming offers
    const query = {
        type,
        targetId,
        status: { $in: ["active", "upcoming"] }
    };

    // Exclude the current offer when editing
    if (excludeOfferId) {
        query._id = { $ne: excludeOfferId };
    }

    const existingOffers = await Offer.find(query).sort({ startDate: 1 }).lean();

    let conflictingOffers = [];
    let latestEndDate = new Date(0);

    const allOffersHtml = existingOffers.map(offer => {
        const offerStart = new Date(offer.startDate);
        const offerEnd = new Date(offer.endDate);

        const isConflict = start <= offerEnd && end >= offerStart;
        if (isConflict) conflictingOffers.push(offer);

        if (offerEnd > latestEndDate) latestEndDate = offerEnd;

        return `<li>
            <strong>${offer.offerName}</strong> (${offer.status}): 
            <span style="color:${isConflict ? 'red' : 'gray'}">
                ${offerStart.toDateString()} → ${offerEnd.toDateString()}
            </span>
        </li>`;
    }).join("");

    if (conflictingOffers.length > 0) {
        const nextAvailable = new Date(latestEndDate);
        nextAvailable.setDate(nextAvailable.getDate() + 1);

        const conflictHtml = `
            <p>Existing ${type} offers:</p>
            <ul>${allOffersHtml}</ul>
            <p>Please choose dates outside the red-highlighted conflicts. 
            Next available start date: <strong style="color:green">${nextAvailable.toDateString()}</strong></p>
        `;
        return conflictHtml;
    }

    return null;
}

module.exports = validateNewOffer;
