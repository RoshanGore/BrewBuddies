import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  notes: {
    type: String,
    default: "",
  },
});

const orderSchema = new mongoose.Schema(
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
      index: true,
    },
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
    },
    tableNumber: {
      type: Number,
      required: [true, "Table number is required"],
      min: 1,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    pointsEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    pointsCredited: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "placed", "accepted", "preparing", "ready", "served", "cancelled"],
      default: "pending",
      index: true,
    },
    appliedOffer: {
      code: String,
      discount: Number,
    },
    appliedReward: {
      title: String,
      pointsRedeemed: Number,
      discount: Number,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid_at_counter", "paid_online"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Backward-compatibility aliases
orderSchema.virtual("totalAmount").get(function () {
  return this.total;
}).set(function (val) {
  this.total = val;
});

orderSchema.virtual("discountAmount").get(function () {
  return this.discount;
}).set(function (val) {
  this.discount = val;
});

orderSchema.virtual("taxAmount").get(function () {
  return this.tax;
}).set(function (val) {
  this.tax = val;
});

orderSchema.virtual("loyaltyPointsEarned").get(function () {
  return this.pointsEarned;
}).set(function (val) {
  this.pointsEarned = val;
});

orderSchema.virtual("customer").get(function () {
  return this.customerId;
}).set(function (val) {
  this.customerId = val;
});

// Compound indexes for multi-tenant querying
orderSchema.index({ cafeId: 1, status: 1 });
orderSchema.index({ cafeId: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ cafeId: 1, orderNumber: 1 });

export default mongoose.model("Order", orderSchema);
