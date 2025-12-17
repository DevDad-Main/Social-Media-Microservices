import { isValidObjectId } from "mongoose";
import { Comment } from "../models/Comment.model.js";
import { catchAsync, logger, sendError, sendSuccess } from "devdad-express-utils";
import { fetchPostFromPostServiceById } from "../utils/fetchPostById.utils.js";
import { fetchUserFromUserServiceById } from "../utils/fetcherUserById.utils.js";


//#region Add Comment
export const addComment = catchAsync(async (req, res, next) => {
  try {
    logger.info("Adding comment", { url: req.url, body: req.body, params: req.params });
    const { postId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(postId)) {
      logger.error("Invalid MongoDB ObjectId");
      return sendError(res, "Invalid MongoDB ObjectId", 400);
    }

    const postResponse = await fetchPostFromPostServiceById(postId);

    if (!postResponse) {
      logger.error("Post not found");
      return sendError(res, "Post not found", 404);
    }

    const newComment = await Comment.create({
      content,
      post: postResponse.data.postId,
      owner: req.user._id?.toString(),
    });

    if (!newComment) {
      logger.error("Failed to create comment");
      return sendError(res, "Failed to create comment", 500);
    }

    const userResponse = await fetchUserFromUserServiceById(req.user._id?.toString());

    if (!userResponse) {
      logger.error("Failed to fetch user");
      return sendError(res, "Failed to fetch user", 500);
    }

    const enrichedComment = {
      ...newComment.toObject(),
      user: userResponse,
    };

    return sendSuccess(res, enrichedComment, "Comment created successfully", 201);
  } catch (error) {
    logger.error("Failed to create comment", { error });
    return sendError(res, error.message || "Failed to create comment", 500);
  }
})
//#endregion

export const testController = catchAsync(async (req, res, next) => {
  return sendSuccess(res, "Hello World!", "Hello World!", 200);
})
