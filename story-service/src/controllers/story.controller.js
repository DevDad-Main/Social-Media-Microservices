import { Story } from "../models/Story.model.js";
import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";
import { clearRedisStoriesCache } from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";
import { postMediaFileToMediaServiceForProcessing } from "../utils/postMediaFilesToMediaService.utils.js";
import { getUserByIdFromUserService } from "../utils/userServiceRequests.utils.js";
import mongoose from "mongoose";
import { getStoriesAggregationPipeline } from "../utils/storiesAggregation.utils.js";

//#region Add New Story
export const addStory = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Add Story Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
  }

  const userId = req.user._id;
  const { content, media_type, background_color } = req.body;

  console.log("REQ.BODY = ", req.body);

  const media = req.file;

  const story = await Story.create({
    user: userId,
    content,
    mediaType: media_type,
    backgroundColour: background_color,
  });

  let mediaURL = "";
  if (media_type === "image" || media_type === "video") {
    try {
      const mediaUploadResult = await postMediaFileToMediaServiceForProcessing(
        story._id.toString(),
        media,
        userId,
      );
      console.log("DEBUG: mediaUploadResult = ", mediaUploadResult);
      mediaURL = mediaUploadResult.data.media.url;
    } catch (error) {
      logger.error(`Failed to process ${media_type}`, { error });
      return sendError(
        res,
        error?.message || `Failed to process ${media_type}`,
        500,
      );
    }
  }

  const enrichedStory = {
    ...story.toObject(),
    media_url: mediaURL,
  };

  //TODO: Later add our inngest functions to delete stories in 24 hours. -> Even better check if RabbitMQ can handle this
  await clearRedisStoriesCache(req);

  return sendSuccess(res, enrichedStory, "Story created successfully", 201);
});
//#endregion

//#region Fetch Story
export const getStories = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id?.toString();

    if (!userId) {
      logger.warn("User Not Authenticated");
      return sendError(res, "User Not Authenticated", 401);
    }

    const cacheKey = `stories`;
    // const cachedPosts = await req.redisClient.get(cacheKey);
    //
    // if (cachedPosts) {
    //   return sendSuccess(
    //     res,
    //     JSON.parse(cachedPosts),
    //     "Stories retrieved successfully (cached)",
    //     200,
    //   );
    // }

    // Fetch current user's full data from user service to get connections and following
    const currentUser = await getUserByIdFromUserService(userId);

    if (!currentUser) {
      logger.warn("User not found");
      return sendError(res, "User not found", 404);
    }

    // Combine user ID with connections and following for story aggregation
    const userIds = [
      userId,
      ...(currentUser.connections || []),
      ...(currentUser.following || []),
    ].filter((id) => id && id.toString() !== userId.toString()); // Remove duplicates and self

    // Add the current user back to ensure we always see our own stories
    userIds.push(userId);

    // Use aggregation pipeline from utils to fetch stories with user data and media
    const stories = await Story.aggregate(
      getStoriesAggregationPipeline(userIds, userId),
    );

    logger.info("Stories fetched successfully", {
      count: stories.length,
    });

    await req.redisClient.set(cacheKey, JSON.stringify(stories), "EX", 300);

    console.log("STORIES = ", stories);

    return sendSuccess(res, stories, "Stories fetched successfully", 200);
  } catch (error) {
    logger.error("Failed to fetch stories", { error });
    return sendError(res, error.message || "Failed to fetch stories", 500);
  }
});
//#endregion

//#region Delete Story
export const deleteStory = catchAsync(async (req, res, next) => {
  const { storyId } = req.params;

  try {
    if (!storyId) {
      logger.warn("Story ID not provided");
      return sendError(res, "Story ID not provided", 400);
    }

    if (!isValidObjectId(storyId)) {
      logger.warn("Invalid Story ID");
      return sendError(res, "Invalid Story ID", 400);
    }

    const deletedStory = await Story.findByIdAndDelete(storyId);

    if (deletedStory.deletedCount === 0) {
      logger.warn("Story Not Deleted");
      return sendError(res, "Story Not Deleted", 404);
    }

    await clearRedisStoriesCache(req);

    return sendSuccess(res, {}, "Story deleted successfully", 200);
  } catch (error) {
    logger.warn("Failed to delete story", { error });
    return sendError(res, error.message || "Failed to delete story", 500);
  }
});
//#endregion
