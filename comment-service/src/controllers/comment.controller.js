import { isValidObjectId } from "mongoose";
import { Comment } from "../models/Comment.model.js";
import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { validationResult } from "express-validator";
import { fetchPostFromPostServiceById } from "../utils/fetchPostById.utils.js";
import { fetchUserFromUserServiceById } from "../utils/fetcherUserById.utils.js";
import {
  clearRedisPostCache,
  clearRedisPostsCache,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";

//#region Add Comment
export const addComment = catchAsync(async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      logger.warn("Add Comment Validation Error: ", { errorMessages });
      return sendError(res, errorMessages.join(", "), 400);
    }

    logger.info("Adding comment", {
      url: req.url,
      body: req.body,
      params: req.params,
    });
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

    const userResponse = await fetchUserFromUserServiceById(req.user._id);
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

    try {
      await publishRabbitMQEvent("comment.created", {
        user: postResponse.data.user,
        from: newComment.owner,
        type: "comment",
        entityId: postResponse.data.postId,
      });
    } catch (error) {
      logger.error("Failed to publish comment created event", { error });
    }

    return sendSuccess(
      res,
      enrichedComment,
      "Comment created successfully",
      201,
    );
  } catch (error) {
    logger.error("Failed to create comment", { error });
    return sendError(res, error.message || "Failed to create comment", 500);
  }
});
//#endregion

//#region Reply To Comment
export const replyToComment = catchAsync(async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((error) => error.msg);
      logger.warn("Reply To Comment Validation Error: ", { errorMessages });
      return sendError(res, errorMessages.join(", "), 400);
    }

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
      parent: parentId,
    });

    if (!newComment) {
      logger.error("Failed to create comment");
      return sendError(res, "Failed to create comment", 500);
    }

    const recipientsComment = await Comment.findByIdAndUpdate(parentId, {
      $addToSet: { replies: newComment._id },
    });

    if (!recipientsComment) {
      logger.error(
        "Failed to add comment to parent comment  || Parent comment not found",
        { parentId },
      );
      return sendError(
        res,
        "Failed to add comment to parent comment  || Parent comment not found",
        500,
      );
    }

    const userResponse = await fetchUserFromUserServiceById(
      newComment.owner.toString(),
    );

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

    return sendSuccess(
      res,
      enrichedComment,
      `Comment added successfully to parent comment: ${parentId}`,
      201,
    );
  } catch (error) {
    logger.error("Failed to add comment", { error });
    return sendError(res, error.message || "Failed to add comment", 500);
  }
});
//#endregion

//#region Fetch Comments By postId
export const fetchCommentsByPost = catchAsync(async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      logger.warn(`Invalid Post ID: ${postId}`);
      return sendError(res, "Invalid Post ID", 400);
    }
    const comments = await Comment.find({ post: postId });

    console.log("DEBUG: comments = ", comments);
    if (comments.length === 0) {
      logger.warn(`No comments found for post: ${postId}`);
      return sendError(res, "No comments found for post", 404);
    }

    return sendSuccess(res, comments, "Comments retrieved successfully", 200);
  } catch (error) {
    logger.error("Failed to fetch comments by post", { error });
    return sendError(
      res,
      error.message || "Failed to fetch comments by post",
      500,
    );
  }
});
//#endregion

//#region Update Comment
export const updateComment = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Update Comment Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
  }

  const { commentId, content } = req.body;

  if (!isValidObjectId(commentId)) {
    logger.error("Invalid MongoDB ObjectId");
    return sendError(res, "Invalid MongoDB ObjectId", 400);
  }

  const commentToUpdate = await Comment.findByIdAndUpdate(commentId, {
    content,
  }).select("content post");

  if (!commentToUpdate) {
    logger.error("Failed to update comment");
    return sendError(res, "Failed to update comment", 500);
  }

  try {
    await Promise.all([
      clearRedisPostCache(req, commentToUpdate.post),
      clearRedisPostsCache(req),
    ]);
  } catch (error) {
    logger.error(error?.message || "Failed to clear cache", { error });
    return sendError(res, error?.message || "Failed to clear cache", 500);
  }

  return sendSuccess(res, commentToUpdate, "Comment updated successfully", 200);
});
//#endregion

//#region Toggle Comment Likes
export const toggleLike = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;
  const { commentId } = req.params;

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    [
      {
        $set: {
          likes: {
            $cond: {
              if: { $in: [userId, "$likes"] },
              then: {
                $filter: {
                  input: "$likes",
                  cond: { $ne: ["$$this", userId] },
                },
              },
              else: { $concatArrays: ["$likes", [userId]] },
            },
          },
        },
      },
    ],
    {
      new: true,
      runValidators: true,
      updatePipeline: true,
    },
  );

  if (!updatedComment) {
    logger.warn(`Comment Not Found: ${commentId}`);
    return sendError(res, "Comment Not Found", 404);
  }

  const isLiked = updatedComment.likes.some(
    (id) => id.toString() === userId.toString(),
  );

  const message = isLiked
    ? "Comment like added successfully"
    : "Comment like removed successfully";

  return sendSuccess(
    res,
    { isLiked, likes: updatedComment.likes.length },
    message,
  );
});
//#endregion

//#region Toggle Comment Dislikes
export const toggleDislike = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;
  const { commentId } = req.params;

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    [
      {
        $set: {
          dislikes: {
            $cond: {
              if: { $in: [userId, "$dislikes"] },
              then: {
                $filter: {
                  input: "$dislikes",
                  cond: { $ne: ["$$this", userId] },
                },
              },
              else: { $concatArrays: ["$dislikes", [userId]] },
            },
          },
        },
      },
    ],
    {
      new: true,
      runValidators: true,
      updatePipeline: true,
    },
  );

  if (!updatedComment) {
    logger.warn(`Comment Not Found: ${commentId}`);
    return sendError(res, "Comment Not Found", 404);
  }

  const isDisliked = updatedComment.dislikes.some(
    (id) => id.toString() === userId.toString(),
  );

  const message = isDisliked
    ? "Comment dislike added successfully"
    : "Comment dislike removed successfully";

  return sendSuccess(
    res,
    { isDisliked, dislikes: updatedComment.dislikes.length },
    message,
  );
});
//#endregion

//#region Delete Comment
export const deleteComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    logger.error("Invalid MongoDB ObjectId");
    return sendError(res, "Invalid MongoDB ObjectId", 400);
  }

  const commentToDelete = await Comment.findByIdAndDelete(commentId);

  if (!commentToDelete) {
    logger.error("Failed to delete comment || Comment Not Found");
    return sendError(res, "Failed to delete comment || Comment Not Found", 500);
  }

  const childrenComments = await Comment.deleteMany({
    parent: commentToDelete,
  });

  if (childrenComments.deletedCount === 0) {
    logger.error(
      "Failed to delete children comments || No children comments found",
    );
    return sendError(
      res,
      "Failed to delete children comments || No children comments found",
      500,
    );
  }

  try {
    await Promise.all([
      clearRedisPostCache(req, postId),
      clearRedisPostsCache(req),
    ]);
  } catch (error) {
    logger.error(error?.message || "Failed to clear cache", { error });
    return sendError(res, error?.message || "Failed to clear cache", 500);
  }

  return sendSuccess(
    res,
    { commentToDelete, childrenComments },
    "Comment deleted successfully",
    200,
  );
});
//#endregion

//#region Test Get Comment By ID
export const getCommentById = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    logger.error("Invalid MongoDB ObjectId");
    return sendError(res, "Invalid MongoDB ObjectId", 400);
  }

  const comment = await Comment.findById(commentId).populate("replies");

  if (!comment) {
    logger.error("Comment not found");
    return sendError(res, "Comment not found", 404);
  }

  return sendSuccess(res, comment, "Comment retrieved successfully", 200);
});
//#endregion
