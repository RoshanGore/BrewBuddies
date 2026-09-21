import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      sparse: true,
      trim: true,
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: String,
      enum: ["customer", "owner", "staff"],
      default: "customer",
      index: true,
    },
    cafeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cafe",
      index: true,
    },
    birthday: {
      type: Date,
    },
    points: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    ordersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual alias for password <-> passwordHash compatibility
userSchema.virtual("password").set(function (val) {
  this.passwordHash = val;
}).get(function () {
  return this.passwordHash;
});

// Virtual alias for points <-> loyaltyPoints compatibility
userSchema.virtual("loyaltyPoints").get(function () {
  return this.points;
}).set(function (val) {
  this.points = val;
});

// Compound indexes for multi-cafe tenancy
userSchema.index({ cafeId: 1, phone: 1 });
userSchema.index({ cafeId: 1, role: 1 });

export default mongoose.model("User", userSchema);
