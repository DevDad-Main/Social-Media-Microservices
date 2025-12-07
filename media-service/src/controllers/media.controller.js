import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { uploadSingleMedia } from "../utils/cloudinary.utils.js";

//#region Upload Media Controller
export const uploadMedia = catchAsync(async (req, res, next) => {
  const profilePicture = req.files?.profile_picture?.[0];
  const coverPhoto = req.files?.cover_photo?.[0];

  if (!profilePicture) {
    return sendError(res, "Profile picture is required", 400);
  }

  if (!coverPhoto) {
    return sendError(res, "Cover photo is required", 400);
  }

  try {
    const profileMedia = await uploadSingleMedia(profilePicture, req.user._id);
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
