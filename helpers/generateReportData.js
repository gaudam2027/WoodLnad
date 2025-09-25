const Order = require('../model/orderSchema');

const generateReportData = async (filter, startDate, endDate) => {
  let unit;
  if (filter === 'daily') unit = 'day';
  else if (filter === 'weekly') unit = 'week';
  else if (filter === 'monthly') unit = 'month';
  else if (filter === 'yearly') unit = 'year';

  const matchStage = {
    orderStatus: { $nin: ['Cancelled', 'Returned'] }
  };

  if (startDate && endDate) {
    matchStage.createdOn = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // === Time Series Aggregation ===
  const timeSeriesData = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { $dateTrunc: { date: '$createdOn', unit: unit } },
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$totalPrice' },
        totalDiscount: {
          $sum: {
            $add: [
              { $ifNull: ['$couponDiscount', 0] },
              { $ifNull: ['$offerDiscount', 0] }
            ]
          }
        },
        finalRevenue: { $sum: '$finalAmount' }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // === Format timeSeries into readable labels ===
  const timeSeries = timeSeriesData.map(item => {
    const date = new Date(item._id);
    let label;

    if (filter === 'daily') {
      label = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (filter === 'weekly') {
      const oneJan = new Date(date.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((date - oneJan) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
      label = `W${weekNum} ${date.getFullYear()}`; // e.g., W34 2025
    } else if (filter === 'monthly') {
      label = date.toLocaleString('default', { month: 'long', year: 'numeric' }); // e.g., August 2025
    } else if (filter === 'yearly') {
      label = date.getFullYear().toString();
    }

    const avgOrder = item.totalOrders > 0
      ? item.finalRevenue / item.totalOrders
      : 0;

    return {
      period: label,
      orders: item.totalOrders,
      sales: item.totalAmount,
      discounts: item.totalDiscount,
      revenue: item.finalRevenue,
      avgOrder
    };
  });

  // === Summary ===
  const summary = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalAmount: { $sum: '$totalPrice' },
        totalDiscount: {
          $sum: {
            $add: [
              { $ifNull: ['$couponDiscount', 0] },
              { $ifNull: ['$offerDiscount', 0] }
            ]
          }
        },
        finalRevenue: { $sum: '$finalAmount' }
      }
    }
  ]);

  return {
    timeSeries,
    summary: summary[0] || {
      totalOrders: 0,
      totalAmount: 0,
      totalDiscount: 0,
      finalRevenue: 0,
      avgOrder: 0
    },
    dateRange: { startDate, endDate }
  };
};

module.exports = {generateReportData}
