import User from "../models/User.js";
import Order from "../models/Order.js";
import CustomerPointsTransaction from "../models/CustomerPointsTransaction.js";
import RewardRedemption from "../models/RewardRedemption.js";

// @desc    Get all customers with loyalty stats (Owner/Staff - Multi-cafe isolated)
// @route   GET /api/customers
export const getCustomers = async (req, res, next) => {
  try {
    const { search, cafeId } = req.query;

    if (req.user?.cafeId && cafeId && req.user.cafeId.toString() !== cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: Cross-cafe access denied",
      });
    }

    const filter = { role: "customer" };

    if (req.user?.cafeId) {
      filter.cafeId = req.user.cafeId;
    } else if (cafeId) {
      filter.cafeId = cafeId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await User.find(filter)
      .select("-passwordHash -password")
      .sort({ points: -1, loyaltyPoints: -1 });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.json({ success: true, count: customers.length, customers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer details, order history, loyalty points & redemptions
// @route   GET /api/customers/:id
export const getCustomerById = async (req, res, next) => {
  try {
    const customer = await User.findOne({ _id: req.params.id, role: "customer" })
      .select("-passwordHash -password");

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    // Cross-tenant check
    if (req.user?.cafeId && customer.cafeId && customer.cafeId.toString() !== req.user.cafeId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden: You cannot view another cafe's customer",
      });
    }

    const cafeId = req.user?.cafeId || customer.cafeId;

    // Fetch order history for this customer at this cafe
    const orderFilter = { customerId: customer._id };
    if (cafeId) orderFilter.cafeId = cafeId;
    const orders = await Order.find(orderFilter).sort({ createdAt: -1 });

    // Fetch loyalty points transactions
    const txFilter = { customerId: customer._id };
    if (cafeId) txFilter.cafeId = cafeId;
    const pointsTransactions = await CustomerPointsTransaction.find(txFilter).sort({ createdAt: -1 });

    // Fetch reward redemptions
    const redempFilter = { customerId: customer._id };
    if (cafeId) redempFilter.cafeId = cafeId;
    const redemptions = await RewardRedemption.find(redempFilter)
      .populate("rewardId", "name title pointsRequired pointsCost rewardType discountValue")
      .sort({ createdAt: -1 });

    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.json({
      success: true,
      customer,
      orders,
      pointsTransactions,
      redemptions,
    });
  } catch (error) {
    next(error);
  }
};

