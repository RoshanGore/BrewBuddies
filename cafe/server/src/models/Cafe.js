import mongoose from "mongoose";

const cafeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cafe name is required"],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    logo: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Owner ID is required"],
      index: true,
    },
    currency: {
      type: String,
      default: "₹",
      trim: true,
    },
    taxRate: {
      type: Number,
      default: 5, // 5%
      min: 0,
      max: 100,
    },
    pointsPerDollar: {
      type: Number,
      default: 1, // ₹1 spent = 1 loyalty point (or per unit)
      min: 1,
    },
    wifiSsid: {
      type: String,
      default: "",
    },
    wifiPassword: {
      type: String,
      default: "",
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

// Indexes
cafeSchema.index({ name: "text" });

export default mongoose.model("Cafe", cafeSchema, "cafes");
