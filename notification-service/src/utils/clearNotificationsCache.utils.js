export async function clearRedisNotificationsCache(req, userId) {
  if (!userId) {
    logger.warn("User ID not provided");
    return;
  }
  const cacheKey = `notifications-for-user-${userId}`;
  const keys = req.redisClient.keys(cacheKey);

  if (Array.isArray(keys) && keys.length > 0) {
    req.redisClient.unlink(keys);
  }
}
