import { logger } from "devdad-express-utils";
import { clearRedisUserCache } from "../utils/cleanRedisCache.utils.js";
import redisClient from "../lib/redis.lib.js";

export async function handlePostCreatedEvent(event) {
  try {
    const { userId } = event;

    if (!userId) {
      logger.warn("Invalid post.created event - missing userId", { event });
      return;
    }

    // Create a mock request object for cache clearing
    const mockReq = { redisClient };

    await clearRedisUserCache(mockReq, userId);

    logger.info("User profile cache cleared after post creation", { userId });
  } catch (error) {
    logger.error("Failed to handle post.created event", { error, event });
  }
}

