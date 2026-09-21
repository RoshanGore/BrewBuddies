import CafeSetting from "../models/CafeSetting.js";
import Cafe from "../models/Cafe.js";

// @desc    Get cafe settings (Scoped to authenticated user's cafe if present)
// @route   GET /api/settings
export const getSettings = async (req, res, next) => {
  try {
    let cafe = null;
    if (req.user?.cafeId) {
      cafe = await Cafe.findById(req.user.cafeId);
    }
    if (!cafe) {
      cafe = await Cafe.findOne();
    }

    let settings = await CafeSetting.findOne();
    if (!settings) {
      settings = await CafeSetting.create({});
    }

    const merged = {
      _id: settings._id,
      cafeId: cafe?._id,
      cafeName: cafe?.name || settings.cafeName,
      name: cafe?.name || settings.cafeName,
      tagline: settings.tagline || "Artisan Coffee & Cozy Bites",
      currency: cafe?.currency || settings.currency || "₹",
      taxRate: cafe?.taxRate !== undefined ? cafe.taxRate : settings.taxRate,
      pointsPerDollar: cafe?.pointsPerDollar !== undefined ? cafe.pointsPerDollar : settings.pointsPerDollar,
      pointsRedemptionRatio: settings.pointsRedemptionRatio || 100,
      wifiSsid: cafe?.wifiSsid || settings.wifiSsid || "",
      wifiPassword: cafe?.wifiPassword || settings.wifiPassword || "",
      address: cafe?.address || settings.address || "",
      phone: cafe?.phone || settings.phone || "",
      email: cafe?.email || "",
      logo: cafe?.logo || "",
    };

    res.json({ success: true, settings: merged });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cafe settings (Owner Only - Scoped to cafeId)
// @route   PUT /api/settings
export const updateSettings = async (req, res, next) => {
  try {
    if (req.user?.role !== "owner") {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Only cafe owners can update cafe settings",
      });
    }

    let cafeId = req.user?.cafeId;
    let cafe = null;
    if (cafeId) {
      cafe = await Cafe.findById(cafeId);
    }
    if (!cafe) {
      cafe = await Cafe.findOne();
    }

    const {
      cafeName,
      name,
      tagline,
      currency,
      taxRate,
      pointsPerDollar,
      pointsRedemptionRatio,
      wifiSsid,
      wifiPassword,
      address,
      phone,
      email,
      logo,
    } = req.body;

    const newName = cafeName || name;

    if (cafe) {
      if (newName) cafe.name = newName;
      if (currency) cafe.currency = currency;
      if (taxRate !== undefined) cafe.taxRate = Number(taxRate);
      if (pointsPerDollar !== undefined) cafe.pointsPerDollar = Number(pointsPerDollar);
      if (wifiSsid !== undefined) cafe.wifiSsid = wifiSsid;
      if (wifiPassword !== undefined) cafe.wifiPassword = wifiPassword;
      if (address !== undefined) cafe.address = address;
      if (phone !== undefined) cafe.phone = phone;
      if (email !== undefined) cafe.email = email;
      if (logo !== undefined) cafe.logo = logo;
      await cafe.save();
    }

    let settings = await CafeSetting.findOne();
    if (!settings) {
      settings = await CafeSetting.create({
        cafeName: newName || "BrewBuddies Cafe",
        tagline: tagline || "Artisan Coffee & Cozy Bites",
        currency: currency || "₹",
        taxRate: taxRate !== undefined ? Number(taxRate) : 5,
        pointsPerDollar: pointsPerDollar !== undefined ? Number(pointsPerDollar) : 10,
        pointsRedemptionRatio: pointsRedemptionRatio !== undefined ? Number(pointsRedemptionRatio) : 100,
        wifiSsid: wifiSsid || "",
        wifiPassword: wifiPassword || "",
        address: address || "",
        phone: phone || "",
      });
    } else {
      if (newName) settings.cafeName = newName;
      if (tagline !== undefined) settings.tagline = tagline;
      if (currency) settings.currency = currency;
      if (taxRate !== undefined) settings.taxRate = Number(taxRate);
      if (pointsPerDollar !== undefined) settings.pointsPerDollar = Number(pointsPerDollar);
      if (pointsRedemptionRatio !== undefined) settings.pointsRedemptionRatio = Number(pointsRedemptionRatio);
      if (wifiSsid !== undefined) settings.wifiSsid = wifiSsid;
      if (wifiPassword !== undefined) settings.wifiPassword = wifiPassword;
      if (address !== undefined) settings.address = address;
      if (phone !== undefined) settings.phone = phone;
      await settings.save();
    }

    const merged = {
      _id: settings._id,
      cafeId: cafe?._id,
      cafeName: cafe?.name || settings.cafeName,
      name: cafe?.name || settings.cafeName,
      tagline: settings.tagline,
      currency: cafe?.currency || settings.currency,
      taxRate: cafe?.taxRate !== undefined ? cafe.taxRate : settings.taxRate,
      pointsPerDollar: cafe?.pointsPerDollar !== undefined ? cafe.pointsPerDollar : settings.pointsPerDollar,
      pointsRedemptionRatio: settings.pointsRedemptionRatio,
      wifiSsid: cafe?.wifiSsid || settings.wifiSsid,
      wifiPassword: cafe?.wifiPassword || settings.wifiPassword,
      address: cafe?.address || settings.address,
      phone: cafe?.phone || settings.phone,
      email: cafe?.email || "",
      logo: cafe?.logo || "",
    };

    res.json({ success: true, message: "Settings saved successfully", settings: merged });
  } catch (error) {
    next(error);
  }
};

