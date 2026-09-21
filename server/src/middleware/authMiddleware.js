import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "brewbuddies_super_secret_jwt_key_2026_change_in_production"
      );

      const user = await User.findById(decoded.id).select("-passwordHash -password");
      if (!user) {
        return res.status(401).json({ success: false, message: "User not found or deactivated" });
      }

      req.user = user;
      req.userId = user._id;
      req.userRole = user.role;
      req.cafeId = user.cafeId;

      return next();
    } catch (error) {
      console.error("[AuthMiddleware] Token error:", error.message);
      return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
  }

  return res.status(401).json({ success: false, message: "Not authorized, no token provided" });
};

// Alias for protect
export const authenticate = protect;

// Role-based access control middleware factory
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: Required role [${roles.join(", ")}]`,
      });
    }
    next();
  };
};

export const isOwnerOrStaff = requireRole("owner", "staff");
export const requireStaffOrOwner = isOwnerOrStaff;
export const requireOwner = requireRole("owner");
export const requireCustomer = requireRole("customer");

// Multi-cafe tenant access control
export const requireCafeAccess = (req, res, next) => {
  const targetCafeId = req.params.cafeId || req.body.cafeId || req.query.cafeId;
  if (targetCafeId && req.user?.cafeId && req.user.cafeId.toString() !== targetCafeId.toString()) {
    return res.status(403).json({
      success: false,
      message: "Access forbidden: You do not have permission to access another cafe's data",
    });
  }
  next();
};

// Optional authentication middleware: attaches user if valid token present, but doesn't block if absent
export const protectOptional = async (req, res, next) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "brewbuddies_super_secret_jwt_key_2026_change_in_production"
      );

      const user = await User.findById(decoded.id).select("-passwordHash -password");
      if (user) {
        req.user = user;
        req.userId = user._id;
        req.userRole = user.role;
        req.cafeId = user.cafeId;
      }
    } catch (error) {
      // Non-blocking: continue as guest if token is expired or invalid
    }
  }
  next();
};


