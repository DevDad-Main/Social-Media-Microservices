import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { PostSearch } from "../models/SearchPost.model";

export const postSearch = catchAsync(async (req, res, next) => {
  const { query } = req.query;

  if (!query) {
    logger.warn("Missing query parameter");
    return sendError(res, "Missing query parameter", 400);
  }

  const results = await PostSearch.find(
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

  return sendSuccess(res, results);
});
