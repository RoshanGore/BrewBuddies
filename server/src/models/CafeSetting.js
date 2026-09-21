import mongoose from "mongoose";

const cafeSettingSchema = new mongoose.Schema(
  {
    cafeName: {
      type: String,
      default: "BrewBuddies Cafe",
      trim: true,
    },
    tagline: {
      type: String,
      default: "Artisan Coffee & Cozy Bites",
      trim: true,
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
    },
    pointsPerDollar: {
      type: Number,
      default: 10, // $1 = 10 points
      min: 1,
    },
    pointsRedemptionRatio: {
      type: Number,
      default: 100, // 100 points = $1
      min: 1,
    },
    wifiSsid: {
      type: String,
      default: "BrewBuddies_Guest_WiFi",
    },
    wifiPassword: {
      type: String,
      default: "BrewCoffee2026",
    },
    address: {
      type: String,
      default: "124 Artisan Alley, Downtown",
    },
    phone: {
      type: String,
      default: "+1 (555) 345-BREW",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("CafeSetting", cafeSettingSchema);
