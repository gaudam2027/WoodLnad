const Order = require('../model/orderSchema');

async function generateReportData(filterType, customDates = {}) {
  try {
    const now = new Date();
    let startDate, endDate, prevStartDate, prevEndDate;
    // console.log(customDates.date)

    // Calculate current and previous period dates
    switch (filterType) {
      case 'daily': {
        const baseDate = customDates.date ? new Date(customDates.date) : now;
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
        
        // Previous day for comparison
        prevStartDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - 1);
        prevEndDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        break;
      }

      case 'weekly': {
        const baseDate = customDates.date ? new Date(customDates.date) : now;
        const dayOfWeek = baseDate.getDay(); // 0=Sunday..6=Saturday
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - dayOfWeek);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 7);
        
        // Previous week for comparison
        prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 7);
        prevEndDate = new Date(startDate);
        break;
      }

      case 'monthly': {
        const baseDate = customDates.date ? new Date(customDates.date) : now;
        startDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
        
        // Previous month for comparison
        prevStartDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
        prevEndDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        break;
      }

      case 'yearly': {
        const year = new Date(customDates.date).getFullYear() || now.getFullYear();
        startDate = new Date(year, 0, 1);
        endDate = new Date(year + 1, 0, 1);
        
        // Previous year for comparison
        prevStartDate = new Date(year - 1, 0, 1);
        prevEndDate = new Date(year, 0, 1);
        break;
      }

      case 'custom': {
        startDate = new Date(customDates.startDate);
        endDate = new Date(customDates.endDate);
        // move endDate to the next day for inclusive match
        endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() + 1);
        
        // Previous period (same duration) for comparison
        const duration = endDate.getTime() - startDate.getTime();
        prevEndDate = new Date(startDate);
        prevStartDate = new Date(startDate.getTime() - duration);
        break;
      }

      default:
        throw new Error('Invalid filter type');
    }

    // Base match conditions
    const baseMatchConditions = {
      orderStatus: { $in: ['Delivered', 'Return Request', 'Return Rejected'] }
    };

    // Current period pipeline
    const currentPeriodPipeline = [
      {
        $match: {
          ...baseMatchConditions,
          createdOn: { $gte: startDate, $lt: endDate }
        }
      },
      { $unwind: "$orderitems" },
      {
        $lookup: {
          from: "products",
          localField: "orderitems.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: "$_id",
          orderId: { $first: "$orderId" },
          orderStatus: { $first: "$orderStatus" },
          totalPrice: { $first: "$totalPrice" },
          finalAmount: { $first: "$finalAmount" },
          couponDiscount: { $first: "$couponDiscount" },
          createdOn: { $first: "$createdOn" },
          orderitems: {
            $push: {
              product: "$productDetails",
              variantId: "$orderitems.variantId",
              quantity: "$orderitems.quantity",
              price: "$orderitems.price",
              status: "$orderitems.status",
              discount: "$orderitems.discount"
            }
          }
        }
      },
      {
        $facet: {
          orders: [{ $sort: { createdOn: -1 } }],
          summary: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalAmount: { $sum: "$finalAmount" },
                totalDiscount: { $sum: "$couponDiscount" }
              }
            }
          ]
        }
      }
    ];

    // Previous period pipeline (for growth calculation)
    const previousPeriodPipeline = [
      {
        $match: {
          ...baseMatchConditions,
          createdOn: { $gte: prevStartDate, $lt: prevEndDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: "$finalAmount" },
          totalDiscount: { $sum: "$couponDiscount" }
        }
      }
    ];

    // Execute both queries
    const [currentResult, previousResult] = await Promise.all([
      Order.aggregate(currentPeriodPipeline),
      Order.aggregate(previousPeriodPipeline)
    ]);

    // Extract current period data
    const currentOrders = currentResult[0]?.orders || [];
    const currentSummary = currentResult[0]?.summary[0] || {
      totalOrders: 0,
      totalAmount: 0,
      totalDiscount: 0
    };

    // Extract previous period data
    const previousSummary = previousResult[0] || {
      totalOrders: 0,
      totalAmount: 0,
      totalDiscount: 0
    };

    // Calculate growth percentages
    const calculateGrowth = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const salesGrowth = calculateGrowth(currentSummary.totalAmount, previousSummary.totalAmount);
    const ordersGrowth = calculateGrowth(currentSummary.totalOrders, previousSummary.totalOrders);
    const discountGrowth = calculateGrowth(currentSummary.totalDiscount, previousSummary.totalDiscount);

    // Enhanced summary with growth data
    const enhancedSummary = {
      ...currentSummary,
      salesGrowth: salesGrowth,
      ordersGrowth: ordersGrowth,
      discountGrowth: discountGrowth,
      previousPeriod: previousSummary
    };

    return {
      orders: currentOrders,
      summary: enhancedSummary,
      period: {
        current: { start: startDate, end: endDate },
        previous: { start: prevStartDate, end: prevEndDate }
      }
    };

  } catch (err) {
    console.error('Error generating report:', err);
    throw err;
  }
}

module.exports = { generateReportData };
