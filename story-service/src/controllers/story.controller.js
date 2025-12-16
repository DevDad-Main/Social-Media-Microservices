import { Story } from "../models/Story.model.js";
import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { validationResult } from "express-validator";
import { isValidObjectId } from "mongoose";
import {
  clearRedisStoriesCache,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";
import { postMediaFileToMediaServiceForProcessing } from "../utils/postMediaFilesToMediaService.utils.js";
import { getUserByIdFromUserService } from "../utils/userServiceRequests.utils.js";
import mongoose from "mongoose";

//#region Add New Story
export const addStory = catchAsync(async (req, res, next) => {
  // const errors = validationResult(req);
  //
  // if (!errors.isEmpty()) {
  //   logger.warn("Validation errors in addStory", { errors });
  //   return sendError(res, "Validation Error", 400, errors.array());
  // }

  const userId = req.user._id;
  const { content, mediaType, backgroundColour } = req.body;

  //TODO for now we will handle it like so as we need to sort issue with express validator and multer.
  if (!content || !mediaType || !backgroundColour) {
    return sendError(res, "Validation Error", 400);
  }

  const image = req.file;

  const story = await Story.create({
    user: userId,
    content,
    mediaType,
    backgroundColour,
  });

  let mediaURL = "";
  if (mediaType === "image") {
    try {
      const mediaUploadResult = await postMediaFileToMediaServiceForProcessing(
        story._id.toString(),
        image,
        userId,
      );
      console.log("DEBUG: mediaUploadResult = ", mediaUploadResult);
      mediaURL = mediaUploadResult.data.media.url;
    } catch (error) {
      logger.error("Failed to process image", { error });
      return sendError(res, error?.message || "Failed to process image", 500);
    }
  }

  const enrichedStory = {
    ...story.toObject(),
    media: mediaURL,
  };

  //TODO: Later add our inngest functions to delete stories in 24 hours. -> Even better check if RabbitMQ can handle this
  await clearRedisStoriesCache(req);

  return sendSuccess(res, enrichedStory, "Story created successfully", 201);
});
//#endregion

//#region Fetch Story
export const getStories = catchAsync(async (req, res, next) => {
  const userId = req.user._id?.toString();

  if (!userId) {
    logger.warn("User Not Authenticated");
    return sendError(res, "User Not Authenticated", 401);
  }


  const cacheKey = `stories`;
  const cachedPosts = await req.redisClient.get(cacheKey);

  if (cachedPosts) {
    return sendSuccess(res, JSON.parse(cachedPosts), "Stories retrieved successfully (cached)", 200);
  }

  try {
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

    // Use aggregation to fetch stories grouped by user with media lookup
    const stories = await Story.aggregate([
      {
        $match: {
          user: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
          // Only fetch stories from the last 24 hours
          createdAt: {
            $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $lookup: {
          from: "storymedias", // StoryMedia collection name
          localField: "_id",
          foreignField: "storyId",
          as: "media",
        },
      },
      {
        $addFields: {
          mediaUrl: {
            $let: {
              vars: {
                storyMedia: { $arrayElemAt: ["$media", 0] },
              },
              in: {
                $cond: {
                  if: { $ne: ["$$storyMedia", null] },
                  then: "$$storyMedia.url",
                  else: null,
                },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$user",
          stories: {
            $push: {
              _id: "$_id",
              content: "$content",
              mediaType: "$mediaType",
              backgroundColour: "$backgroundColour",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
              mediaUrl: "$mediaUrl",
            },
          },
          latestStoryDate: { $max: "$createdAt" },
        },
      },
      {
        $sort: { latestStoryDate: -1 },
      },
    ]);

    // Create a map for user details - start with current user
    const userDetailsMap = new Map();
    userDetailsMap.set(userId.toString(), {
      _id: currentUser._id,
      username: currentUser.username,
      profilePhoto: currentUser.profilePhoto,
    });

    // Get unique user IDs from stories (excluding current user)
    const uniqueUserIds = stories
      .map((storyGroup) => storyGroup._id.toString())
      .filter((id) => id !== userId.toString());

    // Fetch other user details in parallel (only for users who actually have stories)
    if (uniqueUserIds.length > 0) {
      await Promise.all(
        uniqueUserIds.map(async (uid) => {
          try {
            const userDetails = await getUserByIdFromUserService(uid.toString());
            userDetailsMap.set(uid, {
              _id: userDetails._id,
              username: userDetails.username,
              profilePhoto: userDetails.profilePhoto,
            });
          } catch (error) {
            logger.warn(`Failed to fetch details for user ${uid}`, { error });
            userDetailsMap.set(uid, {
              _id: uid,
              username: "Unknown User",
              profilePhoto: null,
            });
          }
        }),
      );
    }

    // Enrich stories with user details
    const enrichedStories = stories.map((storyGroup) => ({
      user: userDetailsMap.get(storyGroup._id.toString()) || {
        _id: storyGroup._id,
        username: "Unknown User",
        profilePhoto: null,
      },
      stories: storyGroup.stories,
      latestStoryDate: storyGroup.latestStoryDate,
    }));

    logger.info("Stories fetched successfully", {
      count: enrichedStories.length,
    });

    await req.redisClient.set(cacheKey, JSON.stringify(enrichedStories), "EX", 300);

    return sendSuccess(
      res,
      enrichedStories,
      "Stories fetched successfully",
      200,
    );
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

    return sendSuccess(res, "Story deleted successfully", 200);
  } catch (error) {
    logger.warn("Failed to delete story", { error });
    return sendError(res, error.message || "Failed to delete story", 500);
  }
});
//#endregion
