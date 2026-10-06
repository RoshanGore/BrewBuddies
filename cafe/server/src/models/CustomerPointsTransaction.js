import mongoose from "mongoose";

const customerPointsTransactionSchema = new mongoose.Schema(
  {
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      required: [true, "Cafe ID is required"],
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["earned", "redeemed", "adjusted"],
      required: [true, "Transaction type is required"],
      index: true,
    },
    points: {
      type: Number,
      required: [true, "Points amount is required"],
    },
    description: {
      type: String,
      default: "",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying a diner's history for a specific cafe
customerPointsTransactionSchema.index({ cafeId: 1, customerId: 1, createdAt: -1 });

export default mongoose.model("CustomerPointsTransaction", customerPointsTransactionSchema);
