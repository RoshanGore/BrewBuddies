import express from "express";
import { getCustomers, getCustomerById } from "../controllers/customerController.js";
import { protect, isOwnerOrStaff } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, isOwnerOrStaff, getCustomers);
router.get("/:id", protect, isOwnerOrStaff, getCustomerById);

export default router;
