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
  clearRedisUserCache,
  clearRedisUsersSearchCache,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";
import { postMediaFileToMediaServiceForProcessing } from "../utils/postMediaFilesToMediaService.utils.js";

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

  const media = req.file;

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
        media,
      );
      console.log("DEBUG: mediaUploadResult = ", mediaUploadResult);
    } catch (error) {
      logger.error("Failed to process images", { error });
      return sendError(res, error?.message || "Failed to process images", 500);
    }
  }

  const enrichedStory = {
    ...story.toObject(),
    media: mediaURL,
  };

  //TODO: Later add our inngest functions to delete stories in 24 hours. -> Even better check if RabbitMQ can handle this

  return sendSuccess(res, enrichedStory, "Story created successfully", 201);
});
//#endregion
