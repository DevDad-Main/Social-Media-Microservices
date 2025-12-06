import { isValidObjectId } from "mongoose";
import { validateNewPostCreation } from "../utils/validation.utils.js";
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

//#region Create Post
export const createPost = catchAsync(async (req, res, next) => {
  const { content, postType, mediaIds } = req.body;
  const { error } = validateNewPostCreation(req.body);

  if (error) {
    logger.warn(
      "New Post Creation Validation Error: ",
      error.details[0].message,
    );
    return sendError(res, error.details[0].message, 400);
  }

  if (!isValidObjectId(req.user._id)) {
    logger.warn(`User ${req.user._id} is not valid`);
    return sendError(res, "User is not valid", 400);
  }

  //HACK: This is a temporary solution to get our controller working.
  //TODO: Later we will implement our redis/ RabbitMQ or BullMQ to handle media uplaods
  // const images = req.files;
  // let imageUrls = ["image1", "image2", "image3"];

  const newelyCreatedPost = await Post.create({
    user: req.user._id,
    content,
    mediaIds,
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
  await clearRedisPostsCache(req);

  return sendSuccess(res, newelyCreatedPost, "Post created successfully", 201);
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
      "Posts retrieved successfully",
      200,
    );
  }

  const posts = await Post.find({})
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });
  //TODO: Refer to commit https://github.com/DevDad-Main/Social-Media-Microservices/commit/f4ec390dbb5df4b5efa39c523a2205a98b1c8782
  // .populate("user", "username");

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
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    logger.warn(`Invalid Post ID: ${id}`);
    return sendError(res, "Invalid Post ID", 400);
  }

  const cacheKey = `post:${id}`;
  const cachedPost = await req.redisClient.get(cacheKey);

  if (cachedPost) {
    return sendSuccess(
      res,
      JSON.parse(cachedPost),
      "Posts retrieved successfully",
      200,
    );
  }

  const post = await Post.findById(id);

  if (!post) {
    logger.warn(`Post with ID ${id} not found`);
    return sendError(res, "Post not found", 404);
  }

  // NOTE: We cache the result for 1 hour as a single post is not expected to change often
  await req.redisClient.set(cacheKey, JSON.stringify(post), "EX", 3600);

  return sendSuccess(res, post, "Post retrieved successfully", 200);
});
//#endregion

//#region Update Post
export const updatePost = catchAsync(async (req, res, next) => {});
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
    logger.error(error?.message || error || "Failed to clear cache");
    return sendError(res, error?.message || "Failed to clear cache", 500);
  }

  return sendSuccess(res, {}, "Post deleted successfully", 200);
});
//#endregion
