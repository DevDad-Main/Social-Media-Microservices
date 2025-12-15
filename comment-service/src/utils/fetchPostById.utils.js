import axios from "axios";
import { AppError, logger } from "devdad-express-utils";

const POST_SERVICE_URL =
  process.env.POST_SERVICE_URL || "http://post-service:3002";

export const fetchPostFromPostServiceById = async (postId) => {
  if (!postId || typeof postId !== "string") {
    throw new AppError("Post Id is not valid", 400);
  }

  try {
    const res = await axios.get(
      `${POST_SERVICE_URL}/api/posts/fetch-post-by-id/${postId}`,
    );
    console.log(res.data);
    return res.data;
  } catch (error) {
    logger.error("Failed to fetch post by id", { error });
    throw new AppError("Failed to fetch post by id", 500);
  }
};
