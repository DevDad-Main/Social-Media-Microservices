export async function clearRedisStoriesCache(req, userId) {
  if (!userId) {
    return;
  }

  const keys = await req.redisClient.keys(`stories:${userId}`);

  if (Array.isArray(keys) && keys.length > 0) {
    await req.redisClient.unlink(keys);
  }
}
