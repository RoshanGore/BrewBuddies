import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: [true, "Cafe ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.Mixed, // Supports ObjectId ref Category or String category name
      ref: "Category",
      required: [true, "Category is required"],
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    image: {
      type: String,
      default: "",
    },
    isVegetarian: {
      type: Boolean,
      default: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    preparationTimeMinutes: {
      type: Number,
      default: 10,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for multi-tenant querying
productSchema.index({ cafeId: 1, category: 1 });
productSchema.index({ cafeId: 1, isAvailable: 1 });
productSchema.index({ cafeId: 1, name: "text", description: "text" });

export default mongoose.model("Product", productSchema);
