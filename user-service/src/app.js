import express from "express";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import userRouter from "./routes/user.routes.js";
import authenticatedUsersRouter from "./routes/authenticatedUsers.routes.js";
import helmet from "helmet";
import { RateLimiterRedis } from "rate-limiter-flexible";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import RedisStore from "rate-limit-redis";
import cors from "cors";
import cookieParser from "cookie-parser";

//#region Constants
const app = express();
const redisClient = new Redis(process.env.REDIS_URL);
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "user-rate-limit-middleware",
  points: 10,
  duration: 1,
});
const expressEndpointRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
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

//NOTE: Trust private/internal proxies (10.x.x.x)
app.set("trust proxy", (ip) => ip.startsWith("10."));

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
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.json({ limit: "10mb" }));
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
app.use("/api/users/register", expressEndpointRateLimiter);
app.use(
  "/api/users",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  userRouter,
);

app.use(
  "/api/auth",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  authenticatedUsersRouter,
);
//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion

export { app };
