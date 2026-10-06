import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";

import { connectDB, checkDBHealth } from "./src/config/db.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

// Routes
import authRoutes from "./src/routes/authRoutes.js";
import productRoutes from "./src/routes/productRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import rewardRoutes from "./src/routes/rewardRoutes.js";
import offerRoutes from "./src/routes/offerRoutes.js";
import tableRoutes from "./src/routes/tableRoutes.js";
import customerRoutes from "./src/routes/customerRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import settingsRoutes from "./src/routes/settingsRoutes.js";
import pointsRoutes from "./src/routes/pointsRoutes.js";

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Disable Express fingerprinting
app.disable("x-powered-by");

// Security: Standard HTTP protection headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

// Connect to Database
connectDB();

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error("CORS policy violation: Access from this origin is not allowed"));
    },
    credentials: true,
  })
);

// Safe JSON body parser limit (1MB max payload)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Lightweight in-memory rate limiter for authentication endpoints
const authAttempts = new Map();
const authRateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // Safe threshold for testing and legitimate multi-logins

  const record = authAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  authAttempts.set(ip, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many authentication requests from this IP. Please try again after 15 minutes.",
    });
  }
  next();
};

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "BrewBuddies Backend API",
    timestamp: new Date().toISOString(),
  });
});

// Database connection health check route (never exposes secrets)
app.get("/api/db-check", async (req, res) => {
  const health = await checkDBHealth();
  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json({
    success: health.status === "healthy",
    service: "BrewBuddies Database Layer",
    health,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/rewards", rewardRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/points", pointsRoutes);

// 404 handler for unknown routes
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.originalUrl}`,
  });
});

// Global Centralized Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[BrewBuddies Server] Running on http://localhost:${PORT}`);
});
