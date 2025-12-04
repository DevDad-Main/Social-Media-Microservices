import { isValidObjectId } from "mongoose";
import { validateNewPostCreation } from "../utils/validation.utils.js";
import { Post } from "../models/Post.model.js";
import {
  logger,
  sendSuccess,
  sendError,
  catchAsync,
} from "devdad-express-utils";

//#region Create Post
export const createPost = catchAsync(async (req, res, next) => {
  const { content, postType } = req.body;
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
  let imageUrls = ["image1", "image2", "image3"];

  const newelyCreatedPost = await Post.create({
    user: req.user._id,
    content,
    imageUrls,
    postType,
  });

  if (!newelyCreatedPost) {
    logger.warn(`Failed to create post`);
    return sendError(res, "Failed to create post", 500);
  }

  return sendSuccess(res, newelyCreatedPost, "Post created successfully", 201);
});
//#endregion

//#region Get All Posts
export const getPosts = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const cacheKey = `posts-page-${page}-limit-${limit}`;
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
    .sort({ createdAt: -1 })
    .populate("user", "username");

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
export const getPostById = catchAsync(async (req, res, next) => {});
//#endregion

//#region Update Post
export const updatePost = catchAsync(async (req, res, next) => {});
//#endregion

//#region Delete Post
export const deletePost = catchAsync(async (req, res, next) => {});
//#endregion
