import Order from "../models/Order.js";
import User from "../models/User.js";
import Cafe from "../models/Cafe.js";
import Product from "../models/Product.js";
import Table from "../models/Table.js";
import Offer from "../models/Offer.js";
import CustomerPointsTransaction from "../models/CustomerPointsTransaction.js";
import RewardRedemption from "../models/RewardRedemption.js";
import CafeSetting from "../models/CafeSetting.js";

// Helper: Generate order number like BB-1024
const generateOrderNumber = () => {
  const dateStr = Date.now().toString().slice(-4);
  const random = Math.floor(100 + Math.random() * 900);
  return `BB-${dateStr}${random}`.slice(0, 8);
};

// @desc    Place a new dine-in order
// @route   POST /api/orders
// @note    CRITICAL: Does NOT award loyalty points. Points are awarded ONLY upon 'served' status.
export const createOrder = async (req, res, next) => {
  try {
    const {
      customerName,
      customerPhone,
      tableNumber,
      tableToken,
      tableId,
      items,
      appliedOffer,
      appliedReward,
      notes,
    } = req.body;

    // 1. Resolve Table & Cafe from Dine-In Context
    let table = null;
    if (tableToken) {
      table = await Table.findOne({ qrToken: tableToken.trim() });
    } else if (tableId) {
      table = await Table.findById(tableId);
    } else if (tableNumber) {
      const targetCafeId = req.cafeId || req.user?.cafeId;
      const filter = { tableNumber: Number(tableNumber) };
      if (targetCafeId) filter.cafeId = targetCafeId;
      table = await Table.findOne(filter);
      if (!table && !targetCafeId) {
        const primaryCafe = await Cafe.findOne();
        if (primaryCafe) {
          table = await Table.findOne({ tableNumber: Number(tableNumber), cafeId: primaryCafe._id });
        }
      }
    }

    if (!table) {
      return res.status(404).json({
        success: false,
        message: "Dine-in table not found. Please scan a valid table QR code.",
      });
    }

    if (table.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "This table is currently inactive or out of service.",
      });
    }

    let cafe = await Cafe.findById(table.cafeId);
    if (!cafe) {
      return res.status(404).json({
        success: false,
        message: "Associated cafe not found for this table",
      });
    }

    // 2. Validate Items & Re-calculate Genuine Product Prices from MongoDB Atlas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    const verifiedItems = [];
    for (const item of items) {
      const prodId = item.productId || item.product || item._id;
      if (!prodId) {
        return res.status(400).json({
          success: false,
          message: `Product ID is required for item '${item.name || "Unknown"}'`,
        });
      }

      const product = await Product.findById(prodId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product '${item.name || prodId}' not found`,
        });
      }

      // Verify product belongs to the current cafe (Multi-tenant check)
      if (product.cafeId.toString() !== cafe._id.toString()) {
        return res.status(400).json({
          success: false,
          message: `Product '${product.name}' does not belong to this cafe`,
        });
      }

      // Verify product is available
      if (product.isAvailable === false) {
        return res.status(400).json({
          success: false,
          message: `Product '${product.name}' is currently unavailable`,
        });
      }

      // Validate item quantity
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product '${product.name}'. Must be at least 1.`,
        });
      }

      // Use genuine MongoDB price (IGNORE client price!)
      verifiedItems.push({
        product: product._id,
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: qty,
        notes: item.notes ? String(item.notes).trim() : "",
      });
    }

    // Compute genuine subtotal from database prices
    const subtotal = verifiedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

    // 3. Server-Side Promo Code Validation (IGNORE client-sent discountAmount!)
    let discountAmount = 0;
    let verifiedOffer = null;

    const promoCode = (appliedOffer?.code || req.body.promoCode || "").trim().toUpperCase();
    if (promoCode) {
      const offer = await Offer.findOne({
        code: promoCode,
        cafeId: cafe._id, // Must belong to same cafe!
      });

      if (!offer) {
        return res.status(400).json({
          success: false,
          message: `Invalid coupon code '${promoCode}' for this cafe`,
        });
      }

      if (offer.isActive === false) {
        return res.status(400).json({
          success: false,
          message: `Coupon code '${promoCode}' is currently inactive`,
        });
      }

      if (offer.endDate && new Date() > new Date(offer.endDate)) {
        return res.status(400).json({
          success: false,
          message: `Coupon code '${promoCode}' has expired`,
        });
      }

      if (subtotal < offer.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount of ₹${offer.minOrderAmount} required for coupon '${promoCode}'`,
        });
      }

      if (offer.discountType === "percentage") {
        discountAmount = (subtotal * offer.discountValue) / 100;
        if (offer.maxDiscount && offer.maxDiscount > 0) {
          discountAmount = Math.min(discountAmount, offer.maxDiscount);
        }
      } else {
        discountAmount = offer.discountValue;
      }

      discountAmount = Math.min(discountAmount, subtotal);
      verifiedOffer = {
        code: offer.code,
        title: offer.title,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        discountAmount: Number(discountAmount.toFixed(2)),
      };
    }

    // 4. Resolve Customer Account
    let user = null;
    let resolvedPhone = "";
    let resolvedName = "";

    if (req.user && req.user.role === "customer") {
      user = req.user;
      resolvedName = user.name;
      resolvedPhone = user.phone;
    } else {
      resolvedName = (customerName || "Dine-in Guest").trim();
      resolvedPhone = (customerPhone || "").trim();

      if (!resolvedPhone) {
        return res.status(400).json({
          success: false,
          message: "Customer phone number is required for dine-in orders",
        });
      }

      user = await User.findOne({ phone: resolvedPhone });
      if (!user) {
        user = await User.create({
          name: resolvedName,
          phone: resolvedPhone,
          role: "customer",
          cafeId: cafe._id,
          points: 50, // Welcome points
        });
      } else if (!user.cafeId && cafe?._id) {
        user.cafeId = cafe._id;
        await user.save();
      }
    }

    // 5. Handle Reward Redemption if applied
    let redeemedPoints = 0;
    if (appliedReward && appliedReward.pointsRedeemed > 0) {
      redeemedPoints = appliedReward.pointsRedeemed;
      const currentPoints = user.points ?? user.loyaltyPoints ?? 0;
      if (currentPoints >= redeemedPoints) {
        user.points = currentPoints - redeemedPoints;
        await user.save();
        if (appliedReward.discount && appliedReward.discount > 0 && !verifiedOffer) {
          discountAmount = Math.min(appliedReward.discount, subtotal);
        }
      }
    }

    // 6. Compute Tax & Total Amount
    let settings = await CafeSetting.findOne();
    const taxRate = cafe.taxRate ?? settings?.taxRate ?? 5;
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Number(((taxableAmount * taxRate) / 100).toFixed(2));
    const totalAmount = Number((taxableAmount + taxAmount).toFixed(2));

    // 7. Save Order: RULE 8 - STRICTLY 0 POINTS CREDITED ON CREATION
    const orderNumber = generateOrderNumber();
    const order = await Order.create({
      cafeId: cafe._id,
      orderNumber,
      customerId: user._id,
      customer: user._id,
      customerName: resolvedName || user.name,
      customerPhone: resolvedPhone || user.phone,
      tableId: table._id,
      tableNumber: table.tableNumber,
      items: verifiedItems,
      subtotal: Number(subtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      discountAmount: Number(discountAmount.toFixed(2)),
      tax: taxAmount,
      taxAmount,
      total: totalAmount,
      totalAmount,
      pointsEarned: 0, // 0 until served!
      pointsCredited: false,
      status: "pending", // Initial state
      appliedOffer: verifiedOffer,
      appliedReward: appliedReward || null,
      loyaltyPointsRedeemed: redeemedPoints,
      paymentStatus: "pending",
      notes: notes ? String(notes).trim() : "",
    });

    // Update table status to occupied
    table.status = "occupied";
    await table.save();

    // Record Reward Redemption transaction if applied
    if (redeemedPoints > 0) {
      await CustomerPointsTransaction.create({
        cafeId: cafe._id,
        customerId: user._id,
        type: "redeemed",
        points: -Math.abs(redeemedPoints),
        description: `Redeemed reward '${appliedReward?.title || "Reward"}' on order #${orderNumber}`,
        orderId: order._id,
      });

      if (appliedReward.id) {
        await RewardRedemption.create({
          cafeId: cafe._id,
          customerId: user._id,
          rewardId: appliedReward.id,
          pointsUsed: redeemedPoints,
          orderId: order._id,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Order #${orderNumber} placed successfully!`,
      order,
      loyalty: {
        pointsEarned: 0,
        pendingPoints: Math.floor(totalAmount * (settings?.pointsPerDollar || 10)),
        totalPoints: user.points ?? user.loyaltyPoints ?? 0,
        redeemedPoints,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's orders (Customer isolation / IDOR protected)
// @route   GET /api/orders/my-orders
export const getMyOrders = async (req, res, next) => {
  try {
    let filter = {};

    // Customer isolation: If authenticated customer, strictly return their own orders
    if (req.user && req.user.role === "customer") {
      filter = { customerId: req.user._id };
    } else {
      const { phone } = req.query;
      if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number required" });
      }
      filter = { customerPhone: phone.trim() };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Track an order by ID or orderNumber (with IDOR protection)
// @route   GET /api/orders/track/:id
export const trackOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    let order;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await Order.findById(id);
    } else {
      order = await Order.findOne({ orderNumber: id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // IDOR Protection: If authenticated customer, verify order belongs to them
    if (req.user && req.user.role === "customer") {
      const isOwner =
        (order.customerId && order.customerId.toString() === req.user._id.toString()) ||
        order.customerPhone === req.user.phone;
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: "Access forbidden: You cannot view another customer's order",
        });
      }
    }

    // Multi-tenant check: If authenticated staff/owner, ensure it belongs to their cafe
    if (req.user && (req.user.role === "owner" || req.user.role === "staff")) {
      if (req.user.cafeId && order.cafeId && order.cafeId.toString() !== req.user.cafeId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access forbidden: Cross-cafe access denied",
        });
      }
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc    Get live active orders for owner/staff (Multi-cafe isolated)
// @route   GET /api/orders/live
export const getLiveOrders = async (req, res, next) => {
  try {
    const { cafeId } = req.query;

    if (req.user?.cafeId && cafeId && req.user.cafeId.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Cross-cafe access denied",
      });
    }

    const liveStatuses = ["placed", "pending", "accepted", "preparing", "ready"];
    const filter = { status: { $in: liveStatuses } };

    if (req.user?.cafeId) {
      filter.cafeId = req.user.cafeId;
    } else if (cafeId) {
      filter.cafeId = cafeId;
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders with optional filter (Multi-cafe isolated)
// @route   GET /api/orders
export const getAllOrders = async (req, res, next) => {
  try {
    const { status, tableNumber, date, cafeId } = req.query;

    if (req.user?.cafeId && cafeId && req.user.cafeId.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Cross-cafe access denied",
      });
    }

    const filter = {};

    if (req.user?.cafeId) {
      filter.cafeId = req.user.cafeId;
    } else if (cafeId) {
      filter.cafeId = cafeId;
    }


    if (status && status !== "all") {
      filter.status = status;
    }

    if (tableNumber) {
      filter.tableNumber = Number(tableNumber);
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Owner/Staff - Multi-cafe isolated & idempotent loyalty crediting)
// @route   PATCH /api/orders/:id/status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body;
    const validStatuses = ["pending", "placed", "accepted", "preparing", "ready", "served", "cancelled"];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid order status" });
    }

    // Multi-tenant check: Order must belong to authenticated staff/owner's cafe
    const filter = { _id: req.params.id };
    if (req.user?.cafeId) {
      filter.cafeId = req.user.cafeId;
    }

    const order = await Order.findOne(filter);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied for this cafe",
      });
    }

    // State machine lifecycle validation
    if (status && order.status !== status) {
      const allowedTransitions = {
        pending: ["pending", "accepted", "cancelled"],
        placed: ["placed", "accepted", "cancelled"],
        accepted: ["accepted", "preparing", "cancelled"],
        preparing: ["preparing", "ready", "cancelled"],
        ready: ["ready", "served", "cancelled"],
        served: ["served"], // terminal state
        cancelled: ["cancelled"], // terminal state
      };

      const currentStatus = order.status || "pending";
      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status transition: Cannot change order status from '${currentStatus}' to '${status}'`,
        });
      }
    }

    // CRITICAL: Loyalty Points Rule 8
    // Points are awarded ONLY when an order transitions to 'served'.
    // Must be completely idempotent: if already pointsCredited or served, do not double-credit.
    if (status === "served") {
      if (!order.pointsCredited && order.status !== "served") {
        let settings = await CafeSetting.findOne({ cafeId: order.cafeId });
        if (!settings) settings = await CafeSetting.findOne();

        const pointsPerDollar = settings?.pointsPerDollar || 10;
        const earnedPoints = Math.floor(order.total * pointsPerDollar);

        let customer = null;
        if (order.customerId) {
          customer = await User.findById(order.customerId);
        } else if (order.customerPhone) {
          customer = await User.findOne({ phone: order.customerPhone, role: "customer" });
          if (customer) {
            order.customerId = customer._id;
          }
        }

        if (customer) {
          customer.points = (customer.points || 0) + earnedPoints;
          customer.totalSpent = Number(((customer.totalSpent || 0) + order.total).toFixed(2));
          customer.ordersCount = (customer.ordersCount || 0) + 1;
          await customer.save();

          if (earnedPoints > 0) {
            await CustomerPointsTransaction.create({
              cafeId: order.cafeId,
              customerId: customer._id,
              type: "earned",
              points: earnedPoints,
              description: `Earned ${earnedPoints} loyalty points for completed order #${order.orderNumber}`,
              orderId: order._id,
            });
          }
        }

        order.pointsEarned = earnedPoints;
        order.pointsCredited = true;
      }
      order.status = "served";
    } else if (status) {
      // Any other status ('accepted', 'preparing', 'ready', 'cancelled') DOES NOT award points
      order.status = status;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    res.json({
      success: true,
      message: `Order status updated to ${order.status}`,
      order,
    });
  } catch (error) {
    next(error);
  }
};
