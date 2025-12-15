import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/Comment.model";
import { catchAsync, logger, sendError } from "devdad-express-utils";
import { fetchPostFromPostServiceById } from "../utils/fetchPostById.utils";
import { fetchUserFromUserServiceById } from "../utils/fetcherUserById.utils";


//#region Add Comment
export const addComment = catchAsync(async (req, res, next) => {
  const { postId, content } = req.body;

  try {
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
      post: postResponse.postId,
      owner: req.user._id,
    });

    if (!newComment) {
      logger.error("Failed to create comment");
      return sendError(res, "Failed to create comment", 500);
    }

    const userResponse = await fetchUserFromUserServiceById(req.user._id);
  } catch (error) {

  }
})
//#endregion
