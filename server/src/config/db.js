import mongoose from "mongoose";

let isConnecting = false;

/**
 * Connect to MongoDB Atlas
 * Uses environment variable MONGODB_URI strictly.
 */
export const connectDB = async () => {
  // If already connected, reuse connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return null;
  }

  try {
    isConnecting = true;
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });

    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    console.log(`[MongoDB] Active Database: ${conn.connection.name}`);
    isConnecting = false;
    return conn.connection;
  } catch (error) {
    isConnecting = false;
    console.warn(`\n============================================================`);
    console.warn(`[MongoDB Error] Connection failed: ${error.message}`);
    console.warn(`Please verify your MONGODB_URI in server/.env`);
    console.warn(`============================================================\n`);
    return null;
  }
};

/**
 * Database Health Check
 * Tests active connection state and ping response time.
 */
export const checkDBHealth = async () => {
  const readyStates = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const state = readyStates[mongoose.connection.readyState] || "unknown";
  const isHealthy = mongoose.connection.readyState === 1;

  let pingTimeMs = null;
  if (isHealthy && mongoose.connection.db) {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      pingTimeMs = Date.now() - start;
    } catch (e) {
      pingTimeMs = null;
    }
  }

  return {
    status: isHealthy ? "healthy" : "unhealthy",
    state,
    readyState: mongoose.connection.readyState,
    database: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
    pingTimeMs,
    modelsLoaded: Object.keys(mongoose.models),
  };
};

export default { connectDB, checkDBHealth };
