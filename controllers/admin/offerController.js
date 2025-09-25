const Product = require('../../model/productSchema')
const Category = require('../../model/categorySchema')
const {offerValidator} = require('../../helpers/validators/offerValidator')
const {isOfferActiveToday} = require('../../helpers/checkTodaydate')  //To check current date for start date in add and edit offer
const validateNewCategoryOffer = require('../../helpers/offer-helpers/validateNewCategoryOffer')
const {applyBestOffersToAllProducts} = require('../../helpers/offer-helpers/offerPrice')
const Offer = require('../../model/offerSchema')


const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({}).sort({createdAt:-1}).lean();
    const products = await Product.find({}, { _id: 1, productName: 1 }).lean();
    const categories = await Category.find({}, { _id: 1, name: 1 }).lean();
    

    // Group offers by type+targetId
    const groupedOffers = {};

    offers.forEach(offer => {
      const key = `${offer.type}:${offer.targetId.toString()}`;

      if (!groupedOffers[key]) {
        groupedOffers[key] = {
          targetId: offer.targetId.toString(),
          type: offer.type,
          offers: [],
          blockedDates: []
        };
      }

      groupedOffers[key].offers.push({
        id: offer._id.toString(),
        offerName: offer.offerName,
        startDate: offer.startDate,
        endDate: offer.endDate,
        offerPercentage: offer.offerPercentage,
        isListed: offer.isListed,
        status: offer.status
      });

      // Generate all blocked dates for this offer
      let currDate = new Date(offer.startDate);
      const endDate = new Date(offer.endDate);

      while (currDate <= endDate) {
        groupedOffers[key].blockedDates.push({
          date: currDate.toISOString().split('T')[0], // YYYY-MM-DD
          message: `${offer.offerName} applied on this date`
        });
        currDate.setDate(currDate.getDate() + 1);
      }
    });

    // Attach readable name
    const offersWithNames = offers.map(offer => {
      let displayName = offer.offerName || '';
      

      if (offer.type === 'Product') {
        const product = products.find(p => p._id.toString() === offer.targetId.toString());
        if (product) displayName = product.productName;
      } 
      else if (offer.type === 'Category') {
        const category = categories.find(c => c._id.toString() === offer.targetId.toString());
        if (category) displayName = category.name;
      }

      
      return {
        ...offer,
        name: displayName
      };
    });


    

    res.render('offerManagement', {
      offers: offersWithNames,
      products,
      categories,
      blockedData: groupedOffers
    });
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).send('Server error');
  }
};


const getOffersApi = async (req, res) => {
  try {
    const { q, status, page = 1} = req.query;
    const limit = 6
    

    const filter = {};

    // Search by offerName
    if (q) {
      filter.offerName = { $regex: q, $options: "i" };
    }

    // Filter by status
    if (status && status !== "all") {
      filter.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch offers with pagination
    const offers = await Offer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const products = await Product.find({}, { _id: 1, productName: 1 }).lean();
    const categories = await Category.find({}, { _id: 1, name: 1 }).lean();

    // Map offers with names + blocked dates
    const offersWithExtras = offers.map(offer => {
      let displayName = offer.offerName || "";

      if (offer.type === "Product") {
        const product = products.find(p => p._id.toString() === offer.targetId.toString());
        if (product) displayName = product.productName;
      } else if (offer.type === "Category") {
        const category = categories.find(c => c._id.toString() === offer.targetId.toString());
        if (category) displayName = category.name;
      }

      // Build blocked dates for each offer
      let blockedDates = [];
      let currDate = new Date(offer.startDate);
      const endDate = new Date(offer.endDate);

      while (currDate <= endDate) {
        blockedDates.push({
          date: currDate.toISOString().split("T")[0],
          message: `${offer.offerName} applied on this date`
        });
        currDate.setDate(currDate.getDate() + 1);
      }

      return {
        ...offer,
        name: displayName,
        blockedDates
      };
    });

    // Total count for pagination
    const total = await Offer.countDocuments(filter);
    
    res.json({
      offers: offersWithExtras,
      total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error("Error fetching offers API:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const addOffer = async (req, res) => {
  try {
    const { type, targetId, offerName, offerPercentage, startDate, endDate } = req.body;

    const errors = offerValidator(type, targetId, offerPercentage, startDate, endDate, offerName);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const conflictMessage = await validateNewCategoryOffer(type, targetId, startDate, endDate);
    if (conflictMessage) {
        return res.status(400).json({ success: false, message: conflictMessage });
    }

    const isOfferActive = isOfferActiveToday(startDate, endDate, offerPercentage);

    const newOffer = new Offer({
      type,
      targetId,
      offerName,
      offerPercentage,
      startDate,
      endDate,
      status: isOfferActive ? "active" : "upcoming",
      isListed: true
    });

    await newOffer.save();

    await applyBestOffersToAllProducts();
    res.json({ success: true, message: 'Offer created successfully', offer: newOffer });

  } catch (error) {
    console.error('Error adding offer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const editOffer = async(req,res) => {
    try {
        const {type, targetId, offerName, offerPercentage, startDate, endDate} = req.body
        const offerId = req.params.id
        const errors = offerValidator(type, targetId, offerPercentage, startDate, endDate, offerName);
        if (errors.length > 0) {
          return res.status(400).json({ success: false, errors });
        }

        const conflictMessage = await validateNewCategoryOffer(type, targetId, startDate, endDate, offerId);
        if (conflictMessage) {
          return res.status(400).json({ success: false, message: conflictMessage });
        }

        const offer = await Offer.findById(offerId);
        if(!offer){
          return res.status(404).json({success: false, message: "Offer not found"})
        }

        // Recalculate status
        const isOfferActive = isOfferActiveToday(startDate, endDate, offerPercentage);
        
        // Update offer
        offer.type = type;
        offer.targetId = targetId;
        offer.offerName = offerName;
        offer.offerPercentage = offerPercentage;
        offer.startDate = startDate;
        offer.endDate = endDate;
        offer.status = isOfferActive ? "active" : "upcoming",

        await offer.save();
        
        await applyBestOffersToAllProducts();
        res.json({ success: true, message: "Offer updated successfully", offer });
        
    } catch (error) {
        console.error("Error editing offer:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
}

const deleteOffer = async(req,res) => {
  try {
    const offerId = req.params.id;

    const offer = await Offer.findByIdAndDelete(offerId)

    if(!offer){
      return res.status(404).json({ success: false, message: "Offer not found" });
    }
    await applyBestOffersToAllProducts();
    res.json({success:true,messege:'Offer deleted successfully'})
  } catch (error) {
    console.error("Error deleting offer:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

const toggleOfferStatus = async(req,res) => {
  try {
    const {isListed} = req.body
    const { id } = req.params;


    if (typeof isListed !== "boolean") {
      return res.status(400).json({ success: false, message: "isListed must be a boolean" });
    }

    const offer = await Offer.findByIdAndUpdate(id,{ isListed },{ new: true });

    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found" });
    }

    await applyBestOffersToAllProducts();

     res.json({
      success: true,
      message: `Offer ${isListed ? "listed" : "unlisted"} successfully`,
      offer
    });

  } catch (error) {
    console.error("Error toggling offer status:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}



module.exports = {
  getOffers,
  addOffer,
  editOffer,
  getOffersApi,
  deleteOffer,
  toggleOfferStatus
}