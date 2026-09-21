import mongoose from "mongoose";

const rewardRedemptionSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: [true, "Cafe ID is required"],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
      index: true,
    },
    rewardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      required: [true, "Reward ID is required"],
      index: true,
    },
    pointsUsed: {
      type: Number,
      required: [true, "Points used is required"],
      min: 1,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

rewardRedemptionSchema.index({ cafeId: 1, customerId: 1, createdAt: -1 });

export default mongoose.model("RewardRedemption", rewardRedemptionSchema);
