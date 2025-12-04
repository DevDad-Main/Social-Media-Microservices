import { isValidObjectId } from "mongoose";
import { Post } from "../models/post.model.js";
import {
  logger,
  sendSuccess,
  sendError,
  catchAsync,
} from "devdad-express-utils";

//#region Create Post
export const createPost = catchAsync(async (req, res, next) => {
  const { content, postType } = req.body;

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

//#region Get Post
export const getPost = catchAsync(async (req, res, next) => {});
//#endregion

//#region Update Post
export const updatePost = catchAsync(async (req, res, next) => {});
//#endregion

//#region Delete Post
export const deletePost = catchAsync(async (req, res, next) => {});
//#endregion
