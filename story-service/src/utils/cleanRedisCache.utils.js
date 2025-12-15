export async function clearRedisStoriesCache(req) {
  const keys = await req.redisClient.keys(`stories`);

  if (Array.isArray(keys) && keys.length > 0) {
    await req.redisClient.unlink(keys);
  }
}
