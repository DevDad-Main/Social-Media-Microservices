import Redis from "ioredis";
import { logger } from "devdad-express-utils";

export const redisClient = new Redis(process.env.REDIS_URL, {
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
