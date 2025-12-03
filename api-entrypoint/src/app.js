import express from "express";
import cors from "cors";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import Redis from "ioredis";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import proxy from "express-http-proxy";

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
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy Error: ${err.message}`);
    return sendError(res, err.message, 500, {
      message: "Internal Server Error",
    });
  },
};
//#endregion

//#region Middleware
app.use(helmet());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(expressEndpointRateLimiter);
//#endregion

//#region Proxy
app.use(
  "/v1/auth",
  proxy(process.env.USER_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      proxyReqOptions.headers["content-type"] = "application/json";
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from User Service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
);
//#endregion

//#region Global Error Handler
app.use(errorHandler);
//#endregion

export { app };
