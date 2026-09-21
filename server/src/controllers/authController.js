import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Cafe from "../models/Cafe.js";

const generateToken = (id, role, cafeId) => {
  return jwt.sign(
    { id, role, cafeId },
    process.env.JWT_SECRET || "brewbuddies_super_secret_jwt_key_2026_change_in_production",
    { expiresIn: "30d" }
  );
};

// @desc    Register a new user (Customer by default)
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, and password",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered. Please sign in instead.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Active cafe assignment
    let cafe = await Cafe.findOne();

    // Security: Force role to customer for public registration (prevent privilege escalation)
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : "",
      passwordHash: hashedPassword,
      role: "customer",
      cafeId: cafe?._id,
      points: 50, // Welcome loyalty points
    });

    const token = generateToken(user._id, user.role, user.cafeId);

    res.status(201).json({
      success: true,
      message: "Account registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        cafeId: user.cafeId,
        loyaltyPoints: user.points,
        points: user.points,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login for Owner / Staff / Customer
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });
    const storedHash = user?.passwordHash || user?.password;

    if (!user || !storedHash) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await bcrypt.compare(password, storedHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id, user.role, user.cafeId);

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        cafeId: user.cafeId,
        loyaltyPoints: user.points ?? user.loyaltyPoints ?? 0,
        points: user.points ?? 0,
        totalSpent: user.totalSpent || 0,
        ordersCount: user.ordersCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Frictionless customer session for table ordering
// @route   POST /api/auth/customer-session
export const customerSession = async (req, res, next) => {
  try {
    const { name, phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required for dine-in loyalty" });
    }

    const cleanPhone = phone.trim();
    let cafe = await Cafe.findOne();
    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      user = await User.create({
        name: name ? name.trim() : "Dine-in Guest",
        phone: cleanPhone,
        role: "customer",
        cafeId: cafe?._id,
        points: 50, // Welcome bonus points!
      });
    } else {
      if (name && user.name === "Dine-in Guest") {
        user.name = name.trim();
      }
      if (!user.cafeId && cafe) {
        user.cafeId = cafe._id;
      }
      await user.save();
    }

    const token = generateToken(user._id, user.role, user.cafeId);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        cafeId: user.cafeId,
        loyaltyPoints: user.points ?? user.loyaltyPoints ?? 0,
        points: user.points ?? 0,
        totalSpent: user.totalSpent || 0,
        ordersCount: user.ordersCount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash -password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        cafeId: user.cafeId,
        loyaltyPoints: user.points ?? user.loyaltyPoints ?? 0,
        points: user.points ?? 0,
        totalSpent: user.totalSpent || 0,
        ordersCount: user.ordersCount || 0,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (email) user.email = email.toLowerCase();
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints,
      },
    });
  } catch (error) {
    next(error);
  }
};
