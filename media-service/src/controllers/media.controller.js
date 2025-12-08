import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { uploadSingleMedia } from "../utils/cloudinary.utils.js";
import { Media } from "../models/Media.model.js";
import { isValidObjectId } from "mongoose";

//#region Upload Media Controller
export const uploadMedia = catchAsync(async (req, res, next) => {
  const { profile_photo_type, cover_photo_type } = req.body;

  const profilePhoto = req.files?.profile_photo?.[0];
  const coverPhoto = req.files?.cover_photo?.[0];

  if (!profilePhoto) {
    return sendError(res, "Profile picture is required", 400);
  }

  if (!coverPhoto) {
    return sendError(res, "Cover photo is required", 400);
  }

  if (!profile_photo_type || !cover_photo_type) {
    logger.warn(
      `Missing Profile Type or Cover Type.. ${profile_photo_type}, ${cover_photo_type}`,
    );
    return sendError(
      res,
      `Missing Profile Type or Cover Type.. ${profile_photo_type}, ${cover_photo_type}`,
      400,
    );
  }

  if (profile_photo_type !== "profile") {
    logger.warn("Profile Type is not equal to 'profile'");
    return sendError(res, "Profile Type is not equal to 'profile'", 400);
  }

  if (cover_photo_type !== "cover") {
    logger.warn("Cover Type is not equal to 'cover'");
    return sendError(res, "Cover Type is not equal to 'cover'", 400);
  }

  try {
    const profileMedia = await uploadSingleMedia(
      profilePhoto,
      req.user._id,
      profile_photo_type,
    );

    const coverMedia = await uploadSingleMedia(
      coverPhoto,
      req.user._id,
      cover_photo_type,
    );

    return sendSuccess(
      res,
      {
        profile: {
          mediaId: profileMedia._id,
          url: profileMedia.url,
        },
        cover: {
          mediaId: coverMedia._id,
          url: coverMedia.url,
        },
        user: {
          _id: req.user._id,
        },
      },
      "Media uploaded successfully",
      201,
    );
  } catch (error) {
    logger.error("Upload error:", error.message);
    return sendError(res, error.message, 500);
  }
});
//#endregion

//#region Fetch User Media
export const fetchUserMedia = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    logger.warn("User Id Not Found");
    return sendError(res, "User Id Not Found", 400);
  }

  if (!isValidObjectId(userId)) {
    logger.warn(`ID: ${userId} is not a valid MongoDB ObjectId`);
    return sendError(res, `ID: ${userId} is not a valid MongoDB ObjectId`, 400);
  }

  const media = await Media.find({ user: userId });

  if (media.length === 0) {
    logger.warn("No Media Found", 404);
    return sendError(res, "No Media Found", 400);
  }

  return sendSuccess(res, media, "Media Fetched Successfully", 200);
});
//#endregion
