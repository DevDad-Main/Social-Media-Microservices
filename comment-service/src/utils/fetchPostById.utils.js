import axios from "axios";
import { AppError, logger } from "devdad-express-utils";

const POST_SERVICE_URL =
  process.env.POST_SERVICE_URL || "http://post-service:3002";

export const fetchPostFromPostServiceById = async (postId) => {
  try {
    if (!postId || typeof postId !== "string") {
      throw new AppError("Post Id is not valid", 400);
    }

    logger.info("Attempting to fetch post", { postId, url: `${POST_SERVICE_URL}/api/posts/fetch-post-by-id/${postId}` });
    const res = await axios.get(
      `${POST_SERVICE_URL}/api/posts/fetch-post-by-id/${postId}`,
      { timeout: 5000 } // 5 second timeout
    );
    logger.info("Successfully fetched post", { data: res.data });

    console.log("DEBUG: res.data = ", res.data);
    return res.data;
  } catch (error) {
    logger.error("Failed to fetch post by id", { error: error.message, code: error.code });
    throw new AppError("Failed to fetch post by id", 500);
  }
};
