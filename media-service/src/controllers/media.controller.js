import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { uploadSingleMedia } from "../utils/cloudinary.utils.js";
import { Media } from "../models/Media.model.js";

//#region Upload Media Controller
export const uploadMedia = catchAsync(async (req, res, next) => {
  const profilePhoto = req.files?.profile_photo?.[0];
  const coverPhoto = req.files?.cover_photo?.[0];

  if (!profilePhoto) {
    return sendError(res, "Profile picture is required", 400);
  }

  if (!coverPhoto) {
    return sendError(res, "Cover photo is required", 400);
  }

  try {
    const profileMedia = await uploadSingleMedia(profilePhoto, req.user._id);
    const coverMedia = await uploadSingleMedia(coverPhoto, req.user._id);

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
