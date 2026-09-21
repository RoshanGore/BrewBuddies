import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { protect, requireOwner, protectOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protectOptional, getSettings);
router.put("/", protect, requireOwner, updateSettings);

export default router;

