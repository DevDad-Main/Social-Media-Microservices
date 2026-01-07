import express from "express";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import helmet from "helmet";
import { RateLimiterRedis } from "rate-limiter-flexible";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import cors from "cors";
import cookieParser from "cookie-parser";
import notificationRouter from "./routes/notification.routes.js";
import redisClient from "./lib/redis.lib.js";

//#region Constants
const app = express();
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "notification-rate-limit-middleware",
  points: 10,
  duration: 1,
});
const expressEndpointRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 100 requests per windowMs - Increase this as we will fetch more data when user navigates the FE tabs -> Potentially add sockets if it's needed
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, _next) => {
    logger.warn(`Public API Rate Limit Exceeded for IP: ${req.ip}`);
    return sendError(res, "Rate Limit Exceeded", 429);
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");
//#endregion

//#region Middleware
app.use(helmet());
//#region CORS Configuration
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "device-remember-token",
      "Access-Control-Allow-Origin",
      "Origin",
      "Accept",
    ],
  }),
);
//#endregion
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate Limit Exceeded for IP: ${req.ip}`);
      return sendError(res, "Rate Limit Exceeded", 429);
    });
});
//#endregion

//#region Route Entry Points
app.use("/api/notifications", expressEndpointRateLimiter);
app.use(
  "/api/notifications",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  notificationRouter,
);
//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion

export { app };
