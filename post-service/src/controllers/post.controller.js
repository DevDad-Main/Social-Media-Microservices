import { isValidObjectId } from "mongoose";
import { validationResult } from "express-validator";
import { Post } from "../models/Post.model.js";
import {
  logger,
  sendSuccess,
  sendError,
  catchAsync,
} from "devdad-express-utils";
import {
  clearRedisPostCache,
  clearRedisPostsCache,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";
import {
  postMediaFilesToMediaServiceForProcessing,
  getPostMediaFilesFromMediaService,
} from "../utils/postServiceAxiosRequests.utils.js";
import { fetchPostCommentsFromCommentService } from "../utils/fetchPostCommentsFromCommentService.js";
import { fetchUserProfilesFromUserService } from "../utils/fetchUserProfilesFromUserService.js";
import {
  runInTransaction,
  executeWithRetry,
} from "../lib/mongodb-session.lib.js";
import { getPostWithAggregation } from "../utils/getPostWithAggregation.utils.js";
import { getPostsWithAggregation } from "../utils/getPostsWithAggregation.utils.js";

//#region Create Post
export const createPost = catchAsync(async (req, res, next) => {
  console.log("DEBUG: req.user = ", req.user);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Create Post Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
  }

  const { content, postType } = req.body;
  const images = req.files?.images || [];

  console.log("DEBUG: req.files =", req.files);
  console.log("DEBUG: images =", images);

  if (!isValidObjectId(req.user._id)) {
    logger.warn(`User ${req.user._id} is not valid`);
    return sendError(res, "User is not valid", 400);
  }

  let newelyCreatedPost;
  let postMediaURLs = [];

  try {
    // Create post first
    newelyCreatedPost = await Post.create({
      user: req.user._id,
      content,
      postType,
    });

    if (!newelyCreatedPost) {
      logger.warn(`Failed to create post`);
      return sendError(res, "Failed to create post", 500);
    }

    // Handle media processing if images are provided
    if (images && images.length > 0) {
      console.log("DEBUG: About to process images - images.length =", {
        imagesLength: images?.length,
        images,
      });

      try {
        console.log("INSIDE IF BLOCK: Processing images");
        const mediaResults = await postMediaFilesToMediaServiceForProcessing(
          newelyCreatedPost._id.toString(),
          images,
        );

        logger.info("MEDIA RESULTS: ", mediaResults);
        postMediaURLs = mediaResults.data.media.urls;
      } catch (mediaError) {
        logger.error("Failed to process images, rolling back post creation", {
          error: mediaError,
        });

        // Compensating transaction: delete the post if media processing fails
        await Post.findByIdAndDelete(newelyCreatedPost._id);

        return sendError(
          res,
          mediaError?.message || "Failed to process images",
          500,
        );
      }
    }

    // Only publish event after all operations succeed
    await publishRabbitMQEvent("post.created", {
      postId: newelyCreatedPost._id.toString(),
      userId: req.user._id.toString(),
      searchTerm: newelyCreatedPost.content,
      postCreatedAt: newelyCreatedPost.createdAt,
    });
  } catch (error) {
    logger.error("Failed to create post", { error });

    // If post was created but something else failed, clean it up
    if (newelyCreatedPost) {
      try {
        await Post.findByIdAndDelete(newelyCreatedPost._id);
      } catch (cleanupError) {
        logger.error("Failed to cleanup post after error", {
          error: cleanupError,
        });
      }
    }

    return sendError(res, error?.message || "Failed to create post", 500);
  }

  try {
    await Promise.all([clearRedisPostsCache(req)]);
  } catch (error) {
    logger.error(error?.message || "Failed to clear cache", { error });
    return sendError(res, error?.message || "Failed to clear cache", 500);
  }

  return sendSuccess(
    res,
    { newelyCreatedPost, postMediaURLs },
    "Post created successfully",
    201,
  );
});
//#endregion

//#region Get All Posts
export const getPosts = catchAsync(async (req, res, next) => {
  const limit = parseInt(req.query.limit) || 10;
  const cursor = req.query.cursor; // createdAt of last post

  const matchStage = cursor ? { createdAt: { $lt: new Date(cursor) } } : {};

  // Use a more specific cache key to avoid collisions
  const cacheKey = `posts:cursor:${cursor || "first"}:${limit}`;
  const cachedPosts = await req.redisClient.get(cacheKey);

  if (cachedPosts) {
    return sendSuccess(
      res,
      JSON.parse(cachedPosts),
      "Posts retrieved successfully (cached)",
      200,
    );
  }

  const posts = await getPostsWithAggregation(matchStage, limit);

  console.log(
    "DEBUG: posts type = ",
    Array.isArray(posts) ? "array" : typeof posts,
  );
  console.log("DEBUG: posts length = ", posts.length);
  console.log("DEBUG: posts = ", JSON.stringify(posts, null, 2));

  const hasMore = posts.length > limit;
  const slicedPosts = hasMore ? posts.slice(0, limit) : posts;

  const nextCursor =
    slicedPosts.length > 0
      ? slicedPosts[slicedPosts.length - 1].createdAt
      : null;

  const result = {
    posts: slicedPosts,
    nextCursor,
    hasMore,
  };

  await req.redisClient.set(cacheKey, JSON.stringify(result), "EX", 300);

  return sendSuccess(res, result, "Posts retrieved successfully", 200);
});
//#endregion

//#region Get Post By Id
export const getPostById = catchAsync(async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      logger.warn(`Invalid Post ID: ${postId}`);
      return sendError(res, "Invalid Post ID", 400);
    }

    const cacheKey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cacheKey);

    if (cachedPost) {
      return sendSuccess(
        res,
        JSON.parse(cachedPost),
        "Posts retrieved successfully (cached)",
        200,
      );
    }

    const post = await getPostWithAggregation(postId);

    if (!post) {
      logger.warn(`Post with ID ${postId} not found`);
      return sendError(res, "Post not found", 404);
    }

    console.log("POST DATA ", post);

    const transformedPostAggregateData = {
      post: {
        content: post.content,
        postType: post.postType,
        likesCount: post.likesCount,
        image_urls: post.image_urls,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        comments: post.comments,

        user: {
          fullName: post.postAuthor.fullName,
          username: post.postAuthor.username,
          profile_photo: post.postAuthor.profile_photo,
        },
      },
    };

    // NOTE: We cache the result for 1 hour as a single post is not expected to change often
    await req.redisClient.set(
      cacheKey,
      JSON.stringify(transformedPostAggregateData),
      "EX",
      3600,
    );

    console.log("Cached post", transformedPostAggregateData);

    return sendSuccess(
      res,
      transformedPostAggregateData,
      "Post retrieved successfully",
      200,
    );
  } catch (error) {
    logger.error("Failed to fetch post:", { error });
    return sendError(res, error.message || "Failed to fetch post", 500);
  }
});
//#endregion

//#region Update Post
export const updatePost = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Update Post Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
  }

  const { postId } = req.params;
  const { content, postType } = req.body;
  const images = req.files?.images || [];

  if (!isValidObjectId(postId)) {
    logger.warn(`Invalid Post ID: ${postId}`);
    return sendError(res, "Invalid Post ID", 400);
  }

  if (!isValidObjectId(req.user._id)) {
    logger.warn(`Invalid User ID: ${req.user._id}`);
    return sendError(res, "Invalid User ID", 400);
  }

  const postToUpdate = await Post.findOneAndUpdate(
    { _id: postId, user: req.user._id },
    { content, postType },
    { new: true, runValidators: true },
  );

  if (!postToUpdate) {
    logger.warn(`Post not found or unauthorized: ${postId}`);
    return sendError(res, "Post not found or unauthorized", 404);
  }

  // Handle image updates if provided
  if (images && images.length > 0) {
    try {
      const mediaResults = await postMediaFilesToMediaServiceForProcessing(
        postToUpdate._id.toString(),
        images,
      );
      logger.info("Update post media results: ", mediaResults);
    } catch (error) {
      logger.error("Failed to process images for update", { error });
      // Don't fail the update, just log the error
    }
  }

  await publishRabbitMQEvent("post.updated", {
    postId: postToUpdate._id.toString(),
    userId: req.user._id.toString(),
    searchTerm: postToUpdate.content,
  });

  try {
    await Promise.all([
      clearRedisPostCache(req, postId),
      clearRedisPostsCache(req),
    ]);
  } catch (error) {
    logger.error("Failed to clear cache after update", { error });
  }

  return sendSuccess(res, postToUpdate, "Post updated successfully", 200);
});
//#endregion

//#region Delete Post
export const deletePostById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.warn(`Invalid Post ID: ${id}`);
    return sendError(res, "Invalid Post ID", 400);
  }

  const postToDelete = await Post.findOneAndDelete({
    _id: id,
    user: req.user._id,
  });

  if (!postToDelete) {
    logger.warn(`Post Not Found: ${id}`);
    return sendError(res, "Post Not Found", 404);
  }

  await publishRabbitMQEvent("post.deleted", {
    postId: postToDelete._id.toString(),
    userId: req.user._id.toString(),
    mediaIds: postToDelete.mediaIds,
  });

  try {
    await Promise.all([
      clearRedisPostCache(req, postToDelete._id.toString()),
      clearRedisPostsCache(req),
    ]);
  } catch (error) {
    logger.error(error?.message || "Failed to clear cache", { error });
    return sendError(res, error?.message || "Failed to clear cache", 500);
  }

  return sendSuccess(res, {}, "Post deleted successfully", 200);
});
//#endregion

//#region Toggle Post Like
export const togglePostLike = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const loggedInUserId = req.user?._id;

  if (!isValidObjectId(postId)) {
    logger.warn(`Invalid MongoDB Post ID: ${postId}`);
    return sendError(res, "Invalid Post ID", 400, { success: false });
  }

  if (!isValidObjectId(loggedInUserId)) {
    logger.warn(`Invalid MongoDB User ID: ${loggedInUserId}`);
    return sendError(res, "Invalid User ID", 400, { success: false });
  }

  const updatedPost = await executeWithRetry(async () => {
    return await Post.findByIdAndUpdate(
      postId,
      [
        {
          $set: {
            likesCount: {
              $cond: {
                if: { $in: [loggedInUserId, "$likesCount"] },
                then: {
                  $filter: {
                    input: "$likesCount",
                    cond: { $ne: ["$$this", loggedInUserId] },
                  },
                },
                else: { $concatArrays: ["$likesCount", [loggedInUserId]] },
              },
            },
          },
        },
      ],
      // NOTE: We need to set updatePipeline to true as we are trying to use an array aggreagate
      { new: true, runValidators: true, updatePipeline: true },
    );
  });

  if (!updatedPost) {
    logger.warn(`Post Not Found: ${postId}`);
    return sendError(res, "Post Not Found", 404, { success: false });
  }

  const isLiked = updatedPost.likesCount.some(
    (id) => id.toString() === loggedInUserId.toString(),
  );

  //TODO: Add a consumer at the other end. Not sure if we need anything to cosume this event but we will see.
  await publishRabbitMQEvent("post.liked", {
    user: updatedPost.user,
    from: loggedInUserId,
    type: "like",
    entityId: updatedPost._id,
  });

  const message = isLiked
    ? "Post like added successfully"
    : "Post like removed successfully";

  try {
    await Promise.all([
      clearRedisPostCache(req, postId),
      clearRedisPostsCache(req),
    ]);
  } catch (error) {
    logger.error("Failed to clear cache after like toggle", { error });
  }

  //NOTE: We return success: true as we don't want to return the updated post -> This could change in the future if the FE requires additional data
  return sendSuccess(res, { success: true }, message, 200);
});
//#endregion

//#region Fetch Post By Id
export const fetchPostById = catchAsync(async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
      logger.warn(`Invalid MongoDB Post ID: ${postId}`);
      return sendError(res, "Invalid Post ID", 400);
    }

    const post = await Post.findById(postId);

    if (!post) {
      logger.warn(`Post Not Found: ${postId}`);
      return sendError(res, "Post Not Found", 404);
    }

    return sendSuccess(
      res,
      { postId: post._id.toString(), user: post.user },
      "Post retrieved successfully",
      200,
    );
  } catch (error) {
    logger.error("Failed to fetch post by id", { error });
    return sendError(res, "Failed to fetch post by id", 500);
  }
});
//#endregion
