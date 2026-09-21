import express from "express";
import {
  getTables,
  resolveTableByToken,
  verifyTable,
  createTable,
  updateTable,
  deleteTable,
} from "../controllers/tableController.js";
import { protect, isOwnerOrStaff, protectOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protectOptional, getTables);
router.get("/resolve/:token", resolveTableByToken);

router.get("/verify/:tableNumber", verifyTable);

router.post("/", protect, isOwnerOrStaff, createTable);
router.put("/:id", protect, isOwnerOrStaff, updateTable);
router.delete("/:id", protect, isOwnerOrStaff, deleteTable);

export default router;
