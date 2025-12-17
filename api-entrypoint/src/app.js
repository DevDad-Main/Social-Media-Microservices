import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import Redis from "ioredis";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import proxy from "express-http-proxy";
import { validateUserToken } from "./middleware/auth.middleware.js";

//#region Constants
const app = express();

const redisClient = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // retry commands indefinitely
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis reconnect attempt #${times}, retrying in ${delay}ms`);
    return delay;
  },
});

redisClient.on("connect", (info) =>
  logger.info("✅ Redis connected", { info }),
);
redisClient.on("error", (err) => logger.error("❌ Redis error:", { err }));

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
    logger.error(`Proxy Error: `, { err });
    return sendError(
      res,
      err.message || err || "Something Went Wrong With Our Proxies",
      500,
      { err },
    );
  },
};

//NOTE: Trust private/internal proxies (10.x.x.x)
app.set("trust proxy", (ip) => ip.startsWith("10."));
//#endregion

//#region Middleware
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(expressEndpointRateLimiter);
//#endregion

//#region User Service Proxy - Public Auth Routes (no token required)
app.use(
  "/v1/users",
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

//#region User Service Proxy - Protected User Routes (token required)
app.use(
  "/v1/auth",
  validateUserToken,
  proxy(process.env.USER_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      proxyReqOptions.headers["content-type"] = "application/json";
      proxyReqOptions.headers["x-user-id"] = srcReq.user._id;
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

//#region Posts Service Proxy
app.use(
  "/v1/posts",
  validateUserToken,
  proxy(process.env.POST_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      if (!srcReq.headers["content-type"] || !srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOptions.headers["content-type"] = "application/json";
      }
      proxyReqOptions.headers["x-user-id"] = srcReq.user._id;
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from Post Service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
);
//#endregion

//#region Story Service Proxy
app.use(
  "/v1/story",
  validateUserToken,
  proxy(process.env.STORY_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      if (!srcReq.headers["content-type"] || !srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOptions.headers["content-type"] = "application/json";
      }
      proxyReqOptions.headers["x-user-id"] = srcReq.user._id;
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from Story Service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
  }),
);
//#endregion

//#region Media Service Proxy
app.use(
  "/v1/media",
  validateUserToken,
  proxy(process.env.MEDIA_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      proxyReqOptions.headers["x-user-id"] = srcReq.user._id;
      if (!srcReq.headers["content-type"] || !srcReq.headers["content-type"].startsWith("multipart/form-data")) {
        proxyReqOptions.headers["content-type"] = "application/json";
      }
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from Media Service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
    parseReqBody: false,
  }),
);
//#endregion

//#region Search Posts Service Proxy
app.use(
  "/v1/search",
  validateUserToken,
  proxy(process.env.SEARCH_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      proxyReqOptions.headers["x-user-id"] = srcReq.user._id;
      proxyReqOptions.headers["content-type"] = "application/json";
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from Search Service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
    parseReqBody: false,
  }),
);
//#endregion

//#region Comments Proxy
app.use(
  "/v1/comments",
  validateUserToken,
  proxy(process.env.COMMENT_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      proxyReqOptions.headers["content-type"] = "application/json";
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from Comment Service: ${proxyRes.statusCode}`,
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
