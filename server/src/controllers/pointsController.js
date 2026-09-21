import CustomerPointsTransaction from "../models/CustomerPointsTransaction.js";
import RewardRedemption from "../models/RewardRedemption.js";
import Reward from "../models/Reward.js";
import Offer from "../models/Offer.js";
import User from "../models/User.js";
import Cafe from "../models/Cafe.js";
import CafeSetting from "../models/CafeSetting.js";

// @desc    Get customer loyalty summary, stats, and recent transactions (Scoped to caller)
// @route   GET /api/points
export const getPointsSummary = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    let cafeId = req.user.cafeId;

    if (!cafeId) {
      const defaultCafe = await Cafe.findOne();
      cafeId = defaultCafe?._id;
    }

    const customer = await User.findById(customerId).select("name email phone points loyaltyPoints role cafeId");
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer account not found" });
    }

    // Customer transactions strictly scoped to caller and caller's cafe
    const transactions = await CustomerPointsTransaction.find({
      customerId,
      cafeId,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate total earned points
    const earnedAgg = await CustomerPointsTransaction.aggregate([
      { $match: { customerId, cafeId, type: "earned" } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);
    const totalEarned = earnedAgg[0]?.total || 0;

    // Calculate total redeemed points
    const redeemedAgg = await CustomerPointsTransaction.aggregate([
      { $match: { customerId, cafeId, type: "redeemed" } },
      { $group: { _id: null, total: { $sum: "$points" } } },
    ]);
    const totalRedeemed = Math.abs(redeemedAgg[0]?.total || 0);

    // Number of rewards redeemed
    const redemptionsCount = await RewardRedemption.countDocuments({
      customerId,
      cafeId,
    });

    // Active rewards count for cafe
    const now = new Date();
    const availableRewardsCount = await Reward.countDocuments({
      cafeId,
      isActive: true,
      $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gte: now } }],
    });

    // Active offers count for cafe
    const activeOffersCount = await Offer.countDocuments({
      cafeId,
      isActive: true,
      $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }],
    });

    // Point conversion rules from Cafe and CafeSetting
    const cafe = await Cafe.findById(cafeId);
    const settings = await CafeSetting.findOne();
    const pointsPerSpend = cafe?.pointsPerDollar || settings?.pointsPerDollar || 10;
    const currency = cafe?.currency || settings?.currency || "₹";

    res.json({
      success: true,
      points: customer.points ?? customer.loyaltyPoints ?? 0,
      totalEarned,
      totalRedeemed,
      redemptionsCount,
      availableRewardsCount,
      activeOffersCount,
      pointsPerSpend,
      currency,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get points transaction history (Scoped to authenticated customer)
// @route   GET /api/points/history
export const getPointsHistory = async (req, res, next) => {
  try {
    const customerId = req.user._id;
    let cafeId = req.user.cafeId;

    if (!cafeId) {
      const defaultCafe = await Cafe.findOne();
      cafeId = defaultCafe?._id;
    }

    const transactions = await CustomerPointsTransaction.find({
      customerId,
      cafeId,
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    next(error);
  }
};
