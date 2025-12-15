export async function clearRedisUserCache(req) {
  const keys = await req.redisClient.keys(`comments`);

  if (Array.isArray(keys) && keys.length > 0) {
    await req.redisClient.unlink(keys);
  }
}

