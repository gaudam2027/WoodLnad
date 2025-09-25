const Order = require("../model/orderSchema");

const getDashboardData = async (filter = "monthly") => {
  const now = new Date();
  let groupStage = {};
  let matchStage = {};

  // Set grouping & date ranges
  if (filter === "yearly") {
    groupStage = { _id: { year: { $year: "$createdOn" } } };
  } else if (filter === "monthly") {
    groupStage = { _id: { year: { $year: "$createdOn" }, month: { $month: "$createdOn" } } };
    matchStage = { createdOn: { $gte: new Date(now.getFullYear(), 0, 1) } }; // this year
  } else if (filter === "daily") {
    groupStage = {
      _id: {
        year: { $year: "$createdOn" },
        month: { $month: "$createdOn" },
        day: { $dayOfMonth: "$createdOn" }
      }
    };
    matchStage = { createdOn: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } }; // this month
  } else {
    // default = monthly
    groupStage = { _id: { year: { $year: "$createdOn" }, month: { $month: "$createdOn" } } };
    matchStage = { createdOn: { $gte: new Date(now.getFullYear(), 0, 1) } };
  }

  // Revenue Data
  const revenueData = await Order.aggregate([
    { $match: matchStage },
    { $group: { ...groupStage, totalRevenue: { $sum: "$finalAmount" } } },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
  ]);

  // Best Selling Products
  const bestProducts = await Order.aggregate([
    { $match: matchStage },
    { $unwind: "$orderitems" },
    {
      $group: {
        _id: "$orderitems.product",
        totalQty: { $sum: "$orderitems.quantity" }
      }
    },
    { $sort: { totalQty: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.productName",
        totalQty: 1,
        image: { $arrayElemAt: ["$product.images", 0] }
      }
    }
  ]);

  // Best Selling Categories
  const bestCategories = await Order.aggregate([
    { $match: matchStage },
    { $unwind: "$orderitems" },
    {
      $lookup: {
        from: "products",
        localField: "orderitems.product",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $group: {
        _id: "$product.category",
        totalQty: { $sum: "$orderitems.quantity" }
      }
    },
    { $sort: { totalQty: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "_id",
        as: "category"
      }
    },
    { $unwind: "$category" },
    { $project: { name: "$category.name", totalQty: 1 } }
  ]);

  return { revenueData, bestProducts, bestCategories };
};

const getLedgerBook = async (filter = "yearly") => {
  const now = new Date();
  let matchStage = {};

  if (filter === "daily") {
    // Current month range
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    matchStage = { createdOn: { $gte: start, $lte: end } };
  } else if (filter === "monthly") {
    // Current year range
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    matchStage = { createdOn: { $gte: start, $lte: end } };
  } else if (filter === "yearly") {
    // No limit → get all years
    matchStage = {};
  }

  //  1. Detailed Ledger Rows
  const details = await Order.aggregate([
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user"
      }
    },
    { $unwind: "$user" },
    { $unwind: "$orderitems" },
    {
      $lookup: {
        from: "products",
        localField: "orderitems.product",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $project: {
        orderId: 1,
        orderDate: "$createdOn",
        orderStatus: 1,
        finalAmount: 1,
        paymentMethod: 1,
        paymentStatus: 1,

        userName: "$user.name",
        userEmail: "$user.email",
        userPhone: "$user.phone",

        itemName: "$product.productName",
        itemQty: "$orderitems.quantity",
        itemPrice: "$orderitems.price",
        itemStatus: "$orderitems.status",

        shippingAddress: {
          name: "$shippingAddress.title",
          city: "$shippingAddress.city",
          state: "$shippingAddress.state",
          pincode: "$shippingAddress.pincode"
        }
      }
    },
    { $sort: { orderDate: -1 } }
  ]);

  // 🔹 2. Summary Ledger (grouped by filter)
  let groupId = {};
  if (filter === "daily") {
    groupId = {
      year: { $year: "$createdOn" },
      month: { $month: "$createdOn" },
      day: { $dayOfMonth: "$createdOn" }
    };
  } else if (filter === "monthly") {
    groupId = {
      year: { $year: "$createdOn" },
      month: { $month: "$createdOn" }
    };
  } else {
    groupId = { year: { $year: "$createdOn" } };
  }

  const summary = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupId,
        totalRevenue: { $sum: "$finalAmount" },
        totalOrders: { $sum: 1 },
        paidOrders: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] }
        },
        codOrders: {
          $sum: { $cond: [{ $eq: ["$paymentMethod", "COD"] }, 1, 0] }
        },
        refundedOrders: {
          $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 1, 0] }
        }
      }
    },
    { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } }
  ]);

  return { details, summary };
};




module.exports = { getDashboardData , getLedgerBook };
