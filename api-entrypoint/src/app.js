import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler, logger, sendError } from "devdad-express-utils";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import proxy from "express-http-proxy";
import { validateUserToken } from "./middleware/auth.middleware.js";
import redisClient from "./lib/redis.lib.js";

//#region Constants
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");
const app = express();

const expressEndpointRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 100 requests per windowMs
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
app.use(cookieParser());

// NOTE: Increase body parser limits for file uploads
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json({ limit: "50mb", type: "application/json" }));

// NOTE: Explicitly handle multipart/form-data without body parsing
app.use((req, res, next) => {
  if (
    req.headers["content-type"] &&
    req.headers["content-type"].startsWith("multipart/form-data")
  ) {
    // Don't parse multipart form data, let the target service handle it
    return next();
  }
  next();
});

// app.use(expressEndpointRateLimiter);
//#endregion

//#region User Service Proxy - Public Auth Routes (no token required)
app.use(
  "/v1/users",
  proxy(process.env.USER_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      if (
        !srcReq.headers["content-type"] ||
        !srcReq.headers["content-type"].startsWith("multipart/form-data")
      ) {
        proxyReqOptions.headers["content-type"] = "application/json";
      }
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from User Service: ${proxyRes.statusCode}`,
      );
      return proxyResData;
    },
    limit: "50mb",
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
      if (
        !srcReq.headers["content-type"] ||
        !srcReq.headers["content-type"].startsWith("multipart/form-data")
      ) {
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
    limit: "50mb",
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
      if (
        !srcReq.headers["content-type"] ||
        !srcReq.headers["content-type"].startsWith("multipart/form-data")
      ) {
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
    limit: "50mb",
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
      if (
        !srcReq.headers["content-type"] ||
        !srcReq.headers["content-type"].startsWith("multipart/form-data")
      ) {
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
    limit: "50mb",
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

//#region Notifications Proxy
app.use(
  "/v1/notifications",
  validateUserToken,
  proxy(process.env.NOTIFICATION_SERVICE_URL, {
    ...proxyOptions,
    // NOTE: Allows us to overwrite certain Request Options before proxying
    proxyReqOptDecorator: (proxyReqOptions, srcReq) => {
      proxyReqOptions.headers["content-type"] = "application/json";
      return proxyReqOptions;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response Received from Notification Service: ${proxyRes.statusCode}`,
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
