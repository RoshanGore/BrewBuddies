import express from "express";
import { getSummary, getCharts } from "../controllers/analyticsController.js";
import { protect, isOwnerOrStaff } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/summary", protect, isOwnerOrStaff, getSummary);
router.get("/charts", protect, isOwnerOrStaff, getCharts);

export default router;
