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
  clearRedisPostsSearchCache,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";
import {
  postMediaFilesToMediaServiceForProcessing,
  getPostMediaFilesFromMediaService,
} from "../utils/postServiceAxiosRequests.utils.js";
import { fetchPostCommentsFromCommentService } from "../utils/fetchPostCommentsFromCommentService.js";
import { fetchUserProfilesFromUserService } from "../utils/fetchUserProfilesFromUserService.js";
import { getPostWithAggregation } from "../utils/getPostWithAggregation.utils.js";

//#region Create Post
export const createPost = catchAsync(async (req, res, next) => {
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

  const newelyCreatedPost = await Post.create({
    user: req.user._id,
    content,
    postType,
  });

  if (!newelyCreatedPost) {
    logger.warn(`Failed to create post`);
    return sendError(res, "Failed to create post", 500);
  }

  await publishRabbitMQEvent("post.created", {
    postId: newelyCreatedPost._id.toString(),
    userId: req.user._id.toString(),
    searchTerm: newelyCreatedPost.content,
    postCreatedAt: newelyCreatedPost.createdAt,
  });

  let postMediaURLs = [];
  console.log(
    "DEBUG: About to check if condition - images.length =",
    images?.length,
  );
  if (images && images.length > 0) {
    try {
      console.log("INSIDE IF BLOCK: Processing images");
      const mediaResults = await postMediaFilesToMediaServiceForProcessing(
        newelyCreatedPost._id.toString(),
        images,
      );

      logger.info("MEDIA RESULTS: ", mediaResults);

      postMediaURLs = mediaResults.data.media.urls;
    } catch (error) {
      logger.error("Failed to process images", { error });
      return sendError(res, error?.message || "Failed to process images", 500);
    }
  }

  try {
    await Promise.all([
      clearRedisPostsCache(req),
      clearRedisPostsSearchCache(req),
    ]);
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const cacheKey = `posts:${page}-${limit}`;
  const cachedPosts = await req.redisClient.get(cacheKey);

  if (cachedPosts) {
    return sendSuccess(
      res,
      JSON.parse(cachedPosts),
      "Posts retrieved successfully (cached)",
      200,
    );
  }

  const posts = await Post.aggregate([
    {
      $lookup: {
        from: "postmedias",
        localField: "_id",
        foreignField: "postId",
        as: "media",
      },
    },
    {
      $lookup: {
        from: "usermedias",
        localField: "user",
        foreignField: "user",
        as: "usermedias",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: {
        path: "$user",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        "user.profilePicture": {
          $let: {
            vars: {
              profileMedia: {
                $filter: {
                  input: "$usermedias",
                  cond: { $eq: ["$$this.type", "profile"] },
                },
              },
            },
            in: { $arrayElemAt: ["$$profileMedia.url", 0] },
          },
        },
        "user.coverPhoto": {
          $let: {
            vars: {
              coverMedia: {
                $filter: {
                  input: "$usermedias",
                  cond: { $eq: ["$$this.type", "cover"] },
                },
              },
            },
            in: { $arrayElemAt: ["$$coverMedia.url", 0] },
          },
        },
        mediaUrls: {
          $reduce: {
            input: "$media",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this.urls"] },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        caption: 1,
        mediaUrls: 1,
        createdAt: 1,

        user: {
          _id: 1,
          username: 1,
          profilePicture: 1,
          coverPhoto: 1,
        },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
  ]);

  const result = {
    posts,
    currentPage: page,
    totalPages: Math.ceil(posts.length / limit),
    limit,
  };

  // NOTE: We cache the result for 5 minutes
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

    // NOTE: We cache the result for 1 hour as a single post is not expected to change often
    await req.redisClient.set(cacheKey, JSON.stringify(post), "EX", 3600);

    return sendSuccess(res, post, "Post retrieved successfully", 200);
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

  const { content, postType } = req.body;
  const images = req.files?.images || [];
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
      clearRedisPostsSearchCache(req),
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
    return sendError(res, "Invalid Post ID", 400);
  }

  if (!isValidObjectId(loggedInUserId)) {
    logger.warn(`Invalid MongoDB User ID: ${loggedInUserId}`);
    return sendError(res, "Invalid User ID", 400);
  }

  const updatedPost = await Post.findByIdAndUpdate(
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

  if (!updatedPost) {
    logger.warn(`Post Not Found: ${postId}`);
    return sendError(res, "Post Not Found", 404);
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

  return sendSuccess(res, updatedPost, message, 200);
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
      { postId: post._id.toString() },
      "Post retrieved successfully",
      200,
    );
  } catch (error) {
    logger.error("Failed to fetch post by id", { error });
    return sendError(res, "Failed to fetch post by id", 500);
  }
});
//#endregion
