import { isValidObjectId } from "mongoose"
import { Comment } from "../models/Comment.model.js";
import { catchAsync, logger, sendError, sendSuccess } from "devdad-express-utils";
import { fetchPostFromPostServiceById } from "../utils/fetchPostById.utils.js";
import { fetchUserFromUserServiceById } from "../utils/fetcherUserById.utils.js";
import { clearRedisPostCache, clearRedisPostsCache } from "../utils/cleanRedisCache.utils.js"



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

    try {
      await Promise.all([
        clearRedisPostCache(req, postId),
        clearRedisPostsCache(req),
      ]);
    } catch (error) {
      logger.error(error?.message || "Failed to clear cache", { error });
      return sendError(res, error?.message || "Failed to clear cache", 500);
    }

    return sendSuccess(res, enrichedComment, "Comment created successfully", 201);
  } catch (error) {
    logger.error("Failed to create comment", { error });
    return sendError(res, error.message || "Failed to create comment", 500);
  }
})
//#endregion

//#region Reply To Comment
export const replyToComment = catchAsync(async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { parentId, content } = req.body;

    if (!isValidObjectId(postId)) {
      logger.error("Invalid MongoDB ObjectId");
      return sendError(res, "Invalid MongoDB ObjectId", 400);
    }

    if (!isValidObjectId(parentId)) {
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
      owner: req.user._id,
      parent: parentId
    })


    if (!newComment) {
      logger.error("Failed to create comment");
      return sendError(res, "Failed to create comment", 500);
    }

    const recipientsComment = await Comment.findByIdAndUpdate(parentId, {
      $addToSet: { replies: newComment._id }
    })

    if (!recipientsComment) {
      logger.error("Failed to add comment to parent comment  || Parent comment not found", { parentId });
      return sendError(res, "Failed to add comment to parent comment  || Parent comment not found", 500);
    }

    const userResponse = await fetchUserFromUserServiceById(newComment.owner.toString())

    if (!userResponse) {
      logger.error("Failed to fetch user");
      return sendError(res, "Failed to fetch user", 500);
    }

    const enrichedComment = {
      ...newComment.toObject(),
      user: userResponse,
    };

    try {
      await Promise.all([
        clearRedisPostCache(req, postId),
        clearRedisPostsCache(req),
      ]);
    } catch (error) {
      logger.error(error?.message || "Failed to clear cache", { error });
      return sendError(res, error?.message || "Failed to clear cache", 500);
    }

    return sendSuccess(res, enrichedComment, `Comment added successfully to parent comment: ${parentId}`, 201);
  } catch (error) {
    logger.error("Failed to add comment", { error });
    return sendError(res, error.message || "Failed to add comment", 500);
  }
})
//#endregion

//#region Fetch Comments By postId
export const fetchCommentsByPost = catchAsync(async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      logger.warn(`Invalid Post ID: ${postId}`);
      return sendError(res, "Invalid Post ID", 400);
    }
    const comments = await Comment.find({ post: postId })

    console.log("DEBUG: comments = ", comments);
    if (comments.length === 0) {
      logger.warn(`No comments found for post: ${postId}`);
      return sendError(res, "No comments found for post", 404);
    }

    return sendSuccess(res, comments, "Comments retrieved successfully", 200);
  } catch (error) {
    logger.error("Failed to fetch comments by post", { error });
    return sendError(res, error.message || "Failed to fetch comments by post", 500)
  }
})
//#endregion
