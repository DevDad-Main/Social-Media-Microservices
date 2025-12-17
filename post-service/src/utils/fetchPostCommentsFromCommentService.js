import axios from "axios";
import { AppError, logger } from "devdad-express-utils";


const COMMENT_SERVICE_URL =
  process.env.COMMENT_SERVICE_URL || "http://comment-service:3006";

export const fetchPostCommentsFromCommentService = async (postId) => {
  if (!postId || typeof postId !== "string") {
    logger.warn("Post Id is not valid");
    throw new AppError("Post Id is not valid", 400);
  }

  const res = await axios.get(
    `${COMMENT_SERVICE_URL}/api/comments/fetch-comments-by-post/${postId}`,
  );

  console.log(
    "DEBUG: comments from our comment service = ",
    res.data,
  );
  return res.data;
};
