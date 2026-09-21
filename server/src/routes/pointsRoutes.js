import express from "express";
import { getPointsSummary, getPointsHistory } from "../controllers/pointsController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, getPointsSummary);
router.get("/history", protect, getPointsHistory);

export default router;
