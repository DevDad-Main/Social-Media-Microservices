import express from "express";
import cors from "cors";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import Redis from "ioredis";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

//#region Constants
const app = express();
const redisClient = new Redis(process.env.REDIS_URL);
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
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(expressEndpointRateLimiter);
//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion
export { app };
