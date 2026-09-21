import express from "express";
import {
  getRewards,
  createReward,
  updateReward,
  deleteReward,
  redeemReward,
  getRedemptionHistory,
} from "../controllers/rewardController.js";
import { protect, isOwnerOrStaff, protectOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer redemption history (Defined BEFORE /:id routes to avoid collision)
router.get("/history", protect, getRedemptionHistory);

// Rewards catalog (Accessible to customers and guests)
router.get("/", protectOptional, getRewards);

// Customer atomic redemption endpoints
router.post("/redeem", protect, redeemReward);
router.post("/:id/redeem", protect, redeemReward);

// Owner / Staff management routes
router.post("/", protect, isOwnerOrStaff, createReward);
router.put("/:id", protect, isOwnerOrStaff, updateReward);
router.delete("/:id", protect, isOwnerOrStaff, deleteReward);

export default router;
