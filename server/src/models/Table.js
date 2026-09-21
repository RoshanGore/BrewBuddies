import mongoose from "mongoose";
import crypto from "crypto";

const tableSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: [true, "Cafe ID is required"],
      index: true,
    },
    tableNumber: {
      type: Number,
      required: [true, "Table number is required"],
      min: 1,
    },
    capacity: {
      type: Number,
      default: 4,
      min: 1,
    },
    qrToken: {
      type: String,
      unique: true,
      sparse: true,
      default: () => crypto.randomBytes(12).toString("hex"),
    },
    status: {
      type: String,
      enum: ["vacant", "occupied"],
      default: "vacant",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure table number is unique per cafe
tableSchema.index({ cafeId: 1, tableNumber: 1 }, { unique: true });

export default mongoose.model("Table", tableSchema);
