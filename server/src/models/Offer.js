import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: [true, "Cafe ID is required"],
      index: true,
    },
    code: {
      type: String,
      required: [true, "Offer code is required"],
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: [true, "Offer title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Backward-compatibility alias
offerSchema.virtual("validUntil").get(function () {
  return this.endDate;
}).set(function (val) {
  this.endDate = val;
});

// Code must be unique per cafe
offerSchema.index({ cafeId: 1, code: 1 }, { unique: true });
offerSchema.index({ cafeId: 1, isActive: 1 });

export default mongoose.model("Offer", offerSchema);
