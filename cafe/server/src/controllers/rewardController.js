import Reward from "../models/Reward.js";
import User from "../models/User.js";
import Cafe from "../models/Cafe.js";
import RewardRedemption from "../models/RewardRedemption.js";
import CustomerPointsTransaction from "../models/CustomerPointsTransaction.js";

// @desc    Get all active rewards (Multi-cafe isolated)
// @route   GET /api/rewards
export const getRewards = async (req, res, next) => {
  try {
    const { cafeId } = req.query;

    if (req.user?.cafeId && cafeId && req.user.cafeId.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Cross-cafe access denied",
      });
    }

    const filter = {};
    const targetCafeId = req.user?.cafeId || cafeId || req.cafeId;
    if (targetCafeId) filter.cafeId = targetCafeId;

    // If customer or unauthenticated guest, filter only active and non-expired rewards
    if (!req.user || req.user.role === "customer") {
      filter.isActive = true;
      const now = new Date();
      filter.$or = [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gte: now } },
      ];
    }

    const rewards = await Reward.find(filter)
      .populate("productId", "name price image")
      .sort({ pointsRequired: 1, pointsCost: 1 });

    res.json({ success: true, count: rewards.length, rewards });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a reward (Owner/Staff - Scoped to cafe)
// @route   POST /api/rewards
export const createReward = async (req, res, next) => {
  try {
    const name = req.body.name || req.body.title;
    const pointsRequired = req.body.pointsRequired !== undefined
      ? Number(req.body.pointsRequired)
      : (req.body.pointsCost !== undefined ? Number(req.body.pointsCost) : null);
    const rewardValue = req.body.rewardValue !== undefined
      ? Number(req.body.rewardValue)
      : (req.body.discountValue !== undefined ? Number(req.body.discountValue) : 0);
    const { description, rewardType, product, productId, expiryDate, isActive } = req.body;

    if (!name || pointsRequired === null || isNaN(pointsRequired)) {
      return res.status(400).json({ success: false, message: "Reward name and points required are required" });
    }

    if (pointsRequired <= 0) {
      return res.status(400).json({ success: false, message: "Points required must be a positive number" });
    }

    let cafeId = req.user?.cafeId || req.cafeId;
    if (!cafeId) {
      const defaultCafe = await Cafe.findOne();
      cafeId = defaultCafe?._id;
    }

    let normalizedRewardType = rewardType || "free_item";
    if (normalizedRewardType === "discount_fixed") normalizedRewardType = "fixed_discount";
    if (normalizedRewardType === "discount_percentage") normalizedRewardType = "percentage_discount";

    const reward = await Reward.create({
      cafeId,
      name,
      description: description || "",
      pointsRequired,
      rewardType: normalizedRewardType,
      rewardValue,
      productId: productId || product || null,
      expiryDate: expiryDate || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, message: "Reward created successfully", reward });
  } catch (error) {
    next(error);
  }
};

// @desc    Update reward (Owner/Staff - Multi-cafe isolated)
// @route   PUT /api/rewards/:id
export const updateReward = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.cafeId) filter.cafeId = req.user.cafeId;

    const pointsRequired = req.body.pointsRequired !== undefined
      ? Number(req.body.pointsRequired)
      : (req.body.pointsCost !== undefined ? Number(req.body.pointsCost) : undefined);

    if (pointsRequired !== undefined && pointsRequired <= 0) {
      return res.status(400).json({ success: false, message: "Points required must be a positive number" });
    }

    const updatePayload = { ...req.body };
    if (req.body.name || req.body.title) updatePayload.name = req.body.name || req.body.title;
    if (pointsRequired !== undefined) updatePayload.pointsRequired = pointsRequired;
    if (req.body.rewardValue !== undefined || req.body.discountValue !== undefined) {
      updatePayload.rewardValue = req.body.rewardValue !== undefined ? Number(req.body.rewardValue) : Number(req.body.discountValue);
    }

    const reward = await Reward.findOneAndUpdate(filter, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!reward) {
      return res.status(404).json({ success: false, message: "Reward not found or access denied for this cafe" });
    }

    res.json({ success: true, message: "Reward updated successfully", reward });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reward (Owner/Staff - Multi-cafe isolated)
// @route   DELETE /api/rewards/:id
export const deleteReward = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.cafeId) filter.cafeId = req.user.cafeId;

    const reward = await Reward.findOneAndDelete(filter);
    if (!reward) {
      return res.status(404).json({ success: false, message: "Reward not found or access denied for this cafe" });
    }
    res.json({ success: true, message: "Reward deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Atomically redeem a reward (Authenticated Customer - Scoped to customer's cafe)
// @route   POST /api/rewards/redeem OR POST /api/rewards/:id/redeem
export const redeemReward = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required to redeem rewards" });
    }

    const rewardId = req.params.id || req.body.rewardId;
    if (!rewardId) {
      return res.status(400).json({ success: false, message: "Reward ID is required" });
    }

    const reward = await Reward.findById(rewardId).populate("productId", "name price");
    if (!reward) {
      return res.status(404).json({ success: false, message: "Reward not found" });
    }

    // 1. Verify cafe ownership (Multi-tenant isolation)
    if (req.user.cafeId && reward.cafeId.toString() !== req.user.cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: You cannot redeem a reward belonging to another cafe",
      });
    }

    // 2. Verify reward is active
    if (!reward.isActive) {
      return res.status(400).json({ success: false, message: "This reward is currently unavailable or inactive" });
    }

    // 3. Verify reward is not expired
    if (reward.expiryDate && new Date() > new Date(reward.expiryDate)) {
      return res.status(400).json({ success: false, message: "This reward has expired" });
    }

    const pointsCost = reward.pointsRequired || reward.pointsCost || 0;

    // 4. Verify customer has enough points
    const currentCustomer = await User.findById(req.user._id);
    const availablePoints = currentCustomer?.points ?? currentCustomer?.loyaltyPoints ?? 0;
    if (!currentCustomer || availablePoints < pointsCost) {
      return res.status(400).json({
        success: false,
        message: `Insufficient loyalty points. You need ${pointsCost} points, but have ${availablePoints} points.`,
      });
    }

    // 5. Atomically deduct points from customer
    // The conditional filter { points: { $gte: pointsCost } } prevents race conditions/overdrafts
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: req.user._id,
        points: { $gte: pointsCost },
      },
      {
        $inc: { points: -pointsCost },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        message: "Redemption failed: Insufficient points or balance modified concurrently",
      });
    }

    // 6. Create RewardRedemption record
    const redemption = await RewardRedemption.create({
      cafeId: reward.cafeId,
      customerId: req.user._id,
      rewardId: reward._id,
      pointsUsed: pointsCost,
    });

    // 7. Create CustomerPointsTransaction record
    await CustomerPointsTransaction.create({
      cafeId: reward.cafeId,
      customerId: req.user._id,
      type: "redeemed",
      points: -pointsCost,
      description: `Redeemed reward: ${reward.name || reward.title}`,
    });

    res.status(200).json({
      success: true,
      message: `Reward '${reward.name || reward.title}' redeemed successfully!`,
      redemption: {
        _id: redemption._id,
        rewardId: reward._id,
        title: reward.name || reward.title,
        name: reward.name || reward.title,
        pointsUsed: pointsCost,
        rewardType: reward.rewardType,
        rewardValue: reward.rewardValue,
        createdAt: redemption.createdAt,
      },
      newBalance: updatedUser.loyaltyPoints,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's reward redemption history (Scoped to authenticated customer & cafe)
// @route   GET /api/rewards/history
export const getRedemptionHistory = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const customerId = req.user._id;
    let cafeId = req.user.cafeId;
    if (!cafeId) {
      const defaultCafe = await Cafe.findOne();
      cafeId = defaultCafe?._id;
    }

    const redemptions = await RewardRedemption.find({
      customerId,
      cafeId,
    })
      .populate("rewardId", "name title rewardType rewardValue pointsRequired pointsCost description")
      .populate("cafeId", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      count: redemptions.length,
      redemptions,
    });
  } catch (error) {
    next(error);
  }
};
