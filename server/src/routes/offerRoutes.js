import express from "express";
import {
  getOffers,
  validateOffer,
  createOffer,
  updateOffer,
  deleteOffer,
} from "../controllers/offerController.js";
import { protect, isOwnerOrStaff, protectOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protectOptional, getOffers);
router.post("/validate", validateOffer);


router.post("/", protect, isOwnerOrStaff, createOffer);
router.put("/:id", protect, isOwnerOrStaff, updateOffer);
router.delete("/:id", protect, isOwnerOrStaff, deleteOffer);

export default router;
