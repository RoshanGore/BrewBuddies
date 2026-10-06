import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Cafe from "../models/Cafe.js";

// @desc    Get all products (with optional category & search filter)
// @route   GET /api/products
export const getProducts = async (req, res, next) => {
  try {
    const { category, search, availableOnly, cafeId } = req.query;
    const filter = {};

    let targetCafeId = cafeId || req.cafeId || req.user?.cafeId;

    // Cross-cafe access prevention: if authenticated user belongs to cafe A, they cannot access cafe B's menu
    if (req.user?.cafeId && cafeId && req.user.cafeId.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Cross-cafe menu access denied",
      });
    }

    if (targetCafeId) {
      if (!targetCafeId.toString().match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ success: false, message: "Invalid cafe ID format" });
      }
      const cafeExists = await Cafe.findById(targetCafeId);
      if (!cafeExists) {
        return res.status(404).json({ success: false, message: "Cafe not found" });
      }
      filter.cafeId = targetCafeId;
    } else {
      // Default to active primary cafe if no cafeId is passed
      const defaultCafe = await Cafe.findOne();
      if (defaultCafe) {
        filter.cafeId = defaultCafe._id;
      }
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (availableOnly === "true") {
      filter.isAvailable = true;
    }

    const products = await Product.find(filter)
      .populate("category", "name icon")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name icon");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (req.user?.cafeId && product.cafeId && req.user.cafeId.toString() !== product.cafeId.toString()) {
      return res.status(403).json({ success: false, message: "Access forbidden: Cross-cafe access denied" });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new product (Owner/Staff - Scoped to cafeId)
// @route   POST /api/products
export const createProduct = async (req, res, next) => {
  try {
    const { name, category, description, price, image, isVegetarian, isAvailable, preparationTimeMinutes, tags } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({ success: false, message: "Name, category, and price are required" });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: "Product price must be non-negative" });
    }

    let cafeId = req.user?.cafeId || req.cafeId;
    if (!cafeId) {
      const defaultCafe = await Cafe.findOne();
      cafeId = defaultCafe?._id;
    }

    const product = await Product.create({
      cafeId,
      name,
      category,
      description,
      price: numPrice,
      image: image || "",
      isVegetarian: isVegetarian !== undefined ? isVegetarian : true,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      preparationTimeMinutes: preparationTimeMinutes ? Number(preparationTimeMinutes) : 10,
      tags: tags || [],
    });

    const populated = await product.populate("category", "name icon");

    res.status(201).json({ success: true, message: "Product created successfully", product: populated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a product (Owner/Staff - Multi-cafe isolated)
// @route   PUT /api/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (req.user?.cafeId && existing.cafeId.toString() !== req.user.cafeId.toString()) {
      return res.status(403).json({ success: false, message: "Access forbidden: Cross-cafe access denied" });
    }

    if (req.body.price !== undefined) {
      const numPrice = Number(req.body.price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ success: false, message: "Product price must be non-negative" });
      }
      req.body.price = numPrice;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("category", "name icon");

    res.json({ success: true, message: "Product updated successfully", product });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product stock/availability (Owner/Staff - Multi-cafe isolated)
// @route   PATCH /api/products/:id/toggle-stock
export const toggleProductStock = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (req.user?.cafeId && product.cafeId.toString() !== req.user.cafeId.toString()) {
      return res.status(403).json({ success: false, message: "Access forbidden: Cross-cafe access denied" });
    }

    product.isAvailable = !product.isAvailable;
    await product.save();

    res.json({
      success: true,
      message: `Product marked as ${product.isAvailable ? "In Stock" : "Out of Stock"}`,
      isAvailable: product.isAvailable,
      product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a product (Owner/Staff - Multi-cafe isolated)
// @route   DELETE /api/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (req.user?.cafeId && product.cafeId.toString() !== req.user.cafeId.toString()) {
      return res.status(403).json({ success: false, message: "Access forbidden: Cross-cafe access denied" });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories
// @route   GET /api/categories
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category (Owner/Staff)
// @route   POST /api/categories
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, icon, displayOrder } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const category = await Category.create({
      name,
      description,
      icon: icon || "coffee",
      displayOrder: displayOrder || 0,
    });

    res.status(201).json({ success: true, message: "Category created successfully", category });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category (Owner/Staff)
// @route   PUT /api/categories/:id
export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category updated successfully", category });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category (Owner/Staff)
// @route   DELETE /api/categories/:id
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (error) {
    next(error);
  }
};
