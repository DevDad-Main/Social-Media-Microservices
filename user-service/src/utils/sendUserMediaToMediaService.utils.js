import axios from "axios";
import FormData from "form-data";
import { AppError, logger } from "devdad-express-utils";
import { isValidObjectId } from "mongoose";
import { clearRedisUserCache } from "./cleanRedisCache.utils.js";

const MEDIA_SERVICE_URL =
  process.env.MEDIA_SERVICE_URL || "http://media-service:3003";

export const sendUserMediaToMediaService = async (
  userId,
  files,
  req = null,
) => {
  try {
    if (!userId || !files) {
      logger.warn("Missing userId or files for media upload");
      return null;
    }

    if (!isValidObjectId(userId)) {
      logger.warn(`ID: ${userId} is not a valid MongoDB ObjectId`);
      throw new AppError("Invalid user ID", 400);
    }

    console.log("DEBUG: files = ", files);
    const formData = new FormData();

    if (files.profile_photo) {
      const file = files.profile_photo[0];

      formData.append("profile_photo", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      formData.append("profile_photo_type", "profile");
    }

    if (files.cover_photo) {
      const file = files.cover_photo[0];

      formData.append("cover_photo", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      formData.append("cover_photo_type", "cover");
    }

    formData.append("userId", userId);

    const response = await axios.post(
      `${MEDIA_SERVICE_URL}/api/media/registration-user-media`,
      formData,
    );

    logger.info("Media uploaded successfully for user:", userId);

    // Clear user cache when media is updated
    if (req) {
      try {
        await clearRedisUserCache(req, userId);
        console.log(
          "DEBUG: Cleared user cache after media upload for user:",
          userId,
        );
      } catch (cacheError) {
        console.error("Failed to clear cache after media upload:", cacheError);
      }
    }

    return response.data;
  } catch (error) {
    logger.error("Failed to send user media to media service:", {
      error: error.message,
      userId,
      hasFiles: !!files,
    });
    throw error;
  }
};
