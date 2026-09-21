import Offer from "../models/Offer.js";
import Cafe from "../models/Cafe.js";

// @desc    Get all active offers (Multi-cafe isolated)
// @route   GET /api/offers
export const getOffers = async (req, res, next) => {
  try {
    const { cafeId } = req.query;

    if (req.user?.cafeId && cafeId && req.user.cafeId.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Cross-cafe access denied",
      });
    }

    const filter = {};
    const targetCafeId = req.user?.cafeId || cafeId || req.cafeId;
    if (targetCafeId) filter.cafeId = targetCafeId;

    // If customer or unauthenticated, only return active and valid date offers
    if (!req.user || req.user.role === "customer") {
      filter.isActive = true;
      const now = new Date();
      filter.$and = [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
      ];
    }

    const offers = await Offer.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: offers.length, offers });
  } catch (error) {
    next(error);
  }
};

// @desc    Validate coupon code against order subtotal
// @route   POST /api/offers/validate
export const validateOffer = async (req, res, next) => {
  try {
    const { code, subtotal, cafeId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const filter = {
      code: code.trim().toUpperCase(),
      isActive: true,
    };
    const targetCafeId = cafeId || req.cafeId || req.user?.cafeId;
    if (targetCafeId) filter.cafeId = targetCafeId;

    const offer = await Offer.findOne(filter);

    if (!offer) {
      return res.status(404).json({ success: false, message: "Invalid or expired coupon code" });
    }

    if (offer.validUntil && new Date() > new Date(offer.validUntil)) {
      return res.status(400).json({ success: false, message: "This coupon code has expired" });
    }

    const orderSubtotal = Number(subtotal) || 0;
    if (orderSubtotal < offer.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount of ₹${offer.minOrderAmount} required for this coupon`,
      });
    }

    let discountAmount = 0;
    if (offer.discountType === "percentage") {
      discountAmount = (orderSubtotal * offer.discountValue) / 100;
      if (offer.maxDiscount && offer.maxDiscount > 0) {
        discountAmount = Math.min(discountAmount, offer.maxDiscount);
      }
    } else {
      discountAmount = offer.discountValue;
    }

    discountAmount = Math.min(discountAmount, orderSubtotal);

    res.json({
      success: true,
      message: `Coupon '${offer.code}' applied! You save ₹${discountAmount.toFixed(2)}`,
      code: offer.code,
      title: offer.title,
      discountAmount: Number(discountAmount.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new offer (Owner/Staff - Scoped to cafe)
// @route   POST /api/offers
export const createOffer = async (req, res, next) => {
  try {
    const code = (req.body.code || req.body.promoCode || "").trim().toUpperCase();
    const { title, description, discountType, discountValue, minOrderAmount, maxDiscount, startDate, endDate, validUntil, isActive } = req.body;

    if (!code || !title || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, message: "Code, title, discount type, and value are required" });
    }

    let cafeId = req.user?.cafeId || req.cafeId;
    if (!cafeId) {
      const defaultCafe = await Cafe.findOne();
      cafeId = defaultCafe?._id;
    }

    const existing = await Offer.findOne({ code, cafeId });
    if (existing) {
      return res.status(400).json({ success: false, message: "Coupon code already exists for this cafe" });
    }

    const offer = await Offer.create({
      cafeId,
      code,
      title,
      description: description || "",
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : 0,
      startDate: startDate || Date.now(),
      endDate: endDate || validUntil || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, message: "Offer created successfully", offer });
  } catch (error) {
    next(error);
  }
};

// @desc    Update offer (Owner/Staff - Multi-cafe isolated)
// @route   PUT /api/offers/:id
export const updateOffer = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.cafeId) filter.cafeId = req.user.cafeId;

    const updatePayload = { ...req.body };
    if (req.body.promoCode && !req.body.code) {
      updatePayload.code = req.body.promoCode.trim().toUpperCase();
    }
    if (req.body.validUntil && !req.body.endDate) {
      updatePayload.endDate = req.body.validUntil;
    }
    if (req.body.discountValue !== undefined) {
      updatePayload.discountValue = Number(req.body.discountValue);
    }

    const offer = await Offer.findOneAndUpdate(filter, updatePayload, {
      new: true,
      runValidators: true,
    });
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found or access denied for this cafe" });
    }
    res.json({ success: true, message: "Offer updated successfully", offer });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete offer (Owner/Staff - Multi-cafe isolated)
// @route   DELETE /api/offers/:id
export const deleteOffer = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user?.cafeId) filter.cafeId = req.user.cafeId;

    const offer = await Offer.findOneAndDelete(filter);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found or access denied for this cafe" });
    }
    res.json({ success: true, message: "Offer deleted successfully" });
  } catch (error) {
    next(error);
  }
};

