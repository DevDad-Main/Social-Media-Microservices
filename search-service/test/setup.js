import { beforeAll, afterAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Redis } from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import searchRouter from "../src/routes/search.routes.js";

let mongoServer;

// Mock Redis for testing
vi.mock("ioredis", () => ({
  Redis: class {
    constructor() {}
    get() { return Promise.resolve(null); }
    set() { return Promise.resolve("OK"); }
    del() { return Promise.resolve(1); }
    exists() { return Promise.resolve(0); }
  },
}));

// Mock RabbitMQ for testing
vi.mock("../src/utils/rabbitmq.utils.js", () => ({
  publishEvent: vi.fn(),
}));

// Mock authentication middleware
vi.mock("../src/middleware/auth.middleware.js", () => ({
  authenticateUserMiddleware: (req, res, next) => {
    req.user = { _id: "507f1f77bcf86cd799439011" };
    next();
  },
}));

beforeAll(async () => {
  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  // Cleanup
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Create test app
export const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Mock rate limiting
app.use((req, res, next) => {
  req.redisClient = new Redis();
  next();
});

// Routes
app.use("/api/search", searchRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});