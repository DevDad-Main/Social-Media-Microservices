import { AppError } from "devdad-express-utils";

export async function clearRedisUserCache(req, id) {
  const keys = await req.redisClient.keys(`user_profile:${id}`);

  if (Array.isArray(keys) && keys.length > 0) {
    await req.redisClient.unlink(keys);
  }
}

export async function clearRedisUsersSearchCache(req) {
  const keys = await req.redisClient.keys("users-search:*");

  if (Array.isArray(keys) && keys.length > 0) {
    await req.redisClient.unlink(keys);
  }
}

export async function clearRedisPostCache(req, input) {
  const cachedPostKey = `post:${input}`;

  if (!cachedPostKey) {
    throw new AppError(`Invalid Post ID: ${input}`, 400, [
      "Redis Cached Post Key Not Found",
      "Please Make Sure You Are Passing The Correct Post ID",
    ]);
  }

  await req.redisClient.unlink(cachedPostKey);
}
