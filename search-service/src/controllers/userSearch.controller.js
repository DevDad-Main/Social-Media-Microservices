import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { UserSearch } from "../models/SearchUser.model.js";

export const userSearch = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    logger.warn("Missing query parameter");
    return sendError(res, "Missing query parameter", 400);
  }

  const cacheKey = `users-search:${query}`;
  const cachedPostsSearch = await req.redisClient.get(cacheKey);

  if (cachedPostsSearch) {
    return sendSuccess(
      res,
      JSON.parse(cachedPostsSearch),
      "User Searches retrieved successfully",
      200,
    );
  }

  const results = await UserSearch.find(
    { $text: { $search: query } },
    {
      score: { $meta: "textScore" },
    },
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(10);

  logger.info(
    `Searched for ${query} and got ${results.length} results: `,
    results,
  );

  // NOTE: We cache the Post Search results for roughly 2-3 mins
  await req.redisClient.set(cacheKey, JSON.stringify(results), "EX", 180);

  return sendSuccess(res, results);
});
