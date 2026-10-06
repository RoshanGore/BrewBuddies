import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Cafe from "../models/Cafe.js";
import CustomerPointsTransaction from "../models/CustomerPointsTransaction.js";

// Helper to get active cafeId (multi-tenant support)
const getCafeFilter = (req) => {
  // If query cafeId differs from authenticated user cafeId, reject
  if (req.user?.cafeId && req.query?.cafeId && req.user.cafeId.toString() !== req.query.cafeId.toString()) {
    const err = new Error("Access forbidden: Cross-cafe access denied");
    err.statusCode = 403;
    throw err;
  }

  if (req.user?.cafeId) {
    return { cafeId: new mongoose.Types.ObjectId(req.user.cafeId) };
  }
  if (req.cafeId) {
    return { cafeId: new mongoose.Types.ObjectId(req.cafeId) };
  }
  if (req.query?.cafeId) {
    return { cafeId: new mongoose.Types.ObjectId(req.query.cafeId) };
  }
  return {};
};

// @desc    Get summary metrics via MongoDB Aggregation Pipelines
// @route   GET /api/analytics/summary
export const getSummary = async (req, res, next) => {
  try {
    const cafeFilter = getCafeFilter(req);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 1. All-time order metrics
    const [allTimeStats] = await Order.aggregate([
      { $match: { ...cafeFilter, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrdersCount: { $sum: 1 },
          averageOrderValue: { $avg: "$total" },
        },
      },
    ]);

    // 2. Today's orders
    const [todayStats] = await Order.aggregate([
      {
        $match: {
          ...cafeFilter,
          status: { $ne: "cancelled" },
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          todayRevenue: { $sum: "$total" },
          todayOrdersCount: { $sum: 1 },
        },
      },
    ]);

    // 3. Status breakdown counts
    const [pendingOrders, preparingOrders, readyOrders, servedOrders, activeOrdersCount] = await Promise.all([
      Order.countDocuments({ ...cafeFilter, status: { $in: ["pending", "placed"] } }),
      Order.countDocuments({ ...cafeFilter, status: "preparing" }),
      Order.countDocuments({ ...cafeFilter, status: "ready" }),
      Order.countDocuments({ ...cafeFilter, status: "served" }),
      Order.countDocuments({ ...cafeFilter, status: { $in: ["pending", "placed", "accepted", "preparing", "ready"] } }),
    ]);

    // 4. Total customers
    const totalCustomers = await User.countDocuments({
      role: "customer",
      ...(cafeFilter.cafeId ? { cafeId: cafeFilter.cafeId } : {}),
    });

    // 5. Total loyalty points issued
    const [pointsStats] = await CustomerPointsTransaction.aggregate([
      {
        $match: {
          ...(cafeFilter.cafeId ? { cafeId: cafeFilter.cafeId } : {}),
          type: "earned",
        },
      },
      {
        $group: {
          _id: null,
          loyaltyPointsIssued: { $sum: "$points" },
        },
      },
    ]);

    res.json({
      success: true,
      summary: {
        todaySales: Number((todayStats?.todayRevenue || 0).toFixed(2)),
        todayRevenue: Number((todayStats?.todayRevenue || 0).toFixed(2)),
        todayOrders: todayStats?.todayOrdersCount || 0,
        todayOrdersCount: todayStats?.todayOrdersCount || 0,
        pendingOrders,
        preparingOrders,
        readyOrders,
        servedOrders,
        activeOrdersCount,
        totalCustomers,
        loyaltyPointsIssued: pointsStats?.loyaltyPointsIssued || 0,
        totalRevenue: Number((allTimeStats?.totalRevenue || 0).toFixed(2)),
        totalOrdersCount: allTimeStats?.totalOrdersCount || 0,
        averageOrderValue: Number((allTimeStats?.averageOrderValue || 0).toFixed(2)),
      },
    });
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

// @desc    Get revenue trend, order trends & top-selling items
// @route   GET /api/analytics/charts
export const getCharts = async (req, res, next) => {
  try {
    const cafeFilter = getCafeFilter(req);
    const range = req.query.range || req.query.period || "7d";

    let daysToLookBack = 6; // default 7 days (including today)
    if (range === "today") daysToLookBack = 0;
    else if (range === "30d") daysToLookBack = 29;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToLookBack);
    startDate.setHours(0, 0, 0, 0);

    // 1. Revenue & orders over time
    const trendsAgg = await Order.aggregate([
      {
        $match: {
          ...cafeFilter,
          status: { $ne: "cancelled" },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const trendsMap = {};
    trendsAgg.forEach((item) => {
      trendsMap[item._id] = item;
    });

    const revenueTrends = [];
    for (let i = daysToLookBack; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", {
        weekday: range === "30d" ? undefined : "short",
        month: range === "30d" ? "short" : undefined,
        day: range === "30d" ? "numeric" : undefined,
      });

      revenueTrends.push({
        day: dayName || key,
        date: key,
        revenue: Number((trendsMap[key]?.revenue || 0).toFixed(2)),
        orders: trendsMap[key]?.orders || 0,
      });
    }

    // 2. Top-selling menu items
    const popularItems = await Order.aggregate([
      { $match: { ...cafeFilter, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.name",
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          name: "$_id",
          quantity: 1,
          revenue: { $round: ["$revenue", 2] },
        },
      },
    ]);

    // 3. Order status distribution
    const statusDistributionAgg = await Order.aggregate([
      { $match: { ...cafeFilter } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusDistribution = statusDistributionAgg.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    // 4. Loyalty points earned and redeemed
    const [loyaltyAgg] = await CustomerPointsTransaction.aggregate([
      {
        $match: {
          ...(cafeFilter.cafeId ? { cafeId: cafeFilter.cafeId } : {}),
        },
      },
      {
        $group: {
          _id: null,
          totalEarned: {
            $sum: { $cond: [{ $eq: ["$type", "earned"] }, "$points", 0] },
          },
          totalRedeemed: {
            $sum: { $cond: [{ $eq: ["$type", "redeemed"] }, "$points", 0] },
          },
        },
      },
    ]);

    res.json({
      success: true,
      range,
      revenueTrends,
      salesOverTime: revenueTrends,
      popularItems,
      statusDistribution,
      loyaltyMetrics: {
        pointsEarned: loyaltyAgg?.totalEarned || 0,
        pointsRedeemed: loyaltyAgg?.totalRedeemed || 0,
      },
    });
  } catch (error) {
    if (error.statusCode === 403) {
      return res.status(403).json({ success: false, message: error.message });
    }
    next(error);
  }
};

