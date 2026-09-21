import express from "express";
import {
  createOrder,
  getMyOrders,
  trackOrder,
  getLiveOrders,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, isOwnerOrStaff, protectOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

// Customer routes (with optional auth for IDOR protection)
router.post("/", protectOptional, createOrder);
router.get("/my-orders", protectOptional, getMyOrders);
router.get("/track/:id", protectOptional, trackOrder);

// Owner / Staff protected routes
router.get("/live", protect, isOwnerOrStaff, getLiveOrders);
router.get("/", protect, isOwnerOrStaff, getAllOrders);
router.patch("/:id/status", protect, isOwnerOrStaff, updateOrderStatus);

export default router;
