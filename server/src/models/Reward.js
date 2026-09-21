import mongoose from "mongoose";

const rewardSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: [true, "Cafe ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Reward name is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    pointsRequired: {
      type: Number,
      required: [true, "Points required is required"],
      min: 1,
    },
    rewardType: {
      type: String,
      enum: ["free_item", "fixed_discount", "percentage_discount"],
      default: "free_item",
    },
    rewardValue: {
      type: Number,
      required: [true, "Reward value is required"],
      min: 0,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiryDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Backward-compatibility aliases
rewardSchema.virtual("title").get(function () {
  return this.name;
}).set(function (val) {
  this.name = val;
});

rewardSchema.virtual("pointsCost").get(function () {
  return this.pointsRequired;
}).set(function (val) {
  this.pointsRequired = val;
});

rewardSchema.virtual("discountValue").get(function () {
  return this.rewardValue;
}).set(function (val) {
  this.rewardValue = val;
});

rewardSchema.virtual("product", {
  ref: "Product",
  localField: "productId",
  foreignField: "_id",
  justOne: true,
});

// Compound index
rewardSchema.index({ cafeId: 1, pointsRequired: 1 });
rewardSchema.index({ cafeId: 1, isActive: 1 });

export default mongoose.model("Reward", rewardSchema);
