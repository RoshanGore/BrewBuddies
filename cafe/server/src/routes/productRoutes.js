import express from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductStock,
  deleteProduct,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/productController.js";
import { protect, isOwnerOrStaff, protectOptional } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public / Customer routes (with optional auth for tenant scoping)
router.get("/", protectOptional, getProducts);
router.get("/categories", getCategories);
router.get("/:id", getProductById);

// Owner / Staff protected routes
router.post("/", protect, isOwnerOrStaff, createProduct);
router.put("/:id", protect, isOwnerOrStaff, updateProduct);
router.patch("/:id/toggle", protect, isOwnerOrStaff, toggleProductStock);
router.patch("/:id/toggle-stock", protect, isOwnerOrStaff, toggleProductStock);
router.delete("/:id", protect, isOwnerOrStaff, deleteProduct);

router.post("/categories", protect, isOwnerOrStaff, createCategory);
router.put("/categories/:id", protect, isOwnerOrStaff, updateCategory);
router.delete("/categories/:id", protect, isOwnerOrStaff, deleteCategory);

export default router;
