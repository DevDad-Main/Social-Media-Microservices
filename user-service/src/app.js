import express from "express";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import userRouter from "./routes/user.routes.js";
import helmet from "helmet";
import { RateLimiterRedis } from "rate-limiter-flexible";
import rateLimit from "express-rate-limit";
import Redis from "ioredis";
import RedisStore from "rate-limit-redis";
import cors from "cors";

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
//#endregion

//#region Middleware
app.use(helmet());
//TODO: Add CORS custom configuration
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
app.use("/api/auth/register", expressEndpointRateLimiter);
app.use(
  "/api/auth",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  userRouter,
);
//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion

export { app };
