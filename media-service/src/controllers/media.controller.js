import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { uploadMediaBufferToCloudinary } from "../utils/cloudinary.utils";
import { Media } from "../models/Media.model.js";

export const uploadMedia = catchAsync(async (req, res, next) => {
  const media = req.file;

  if (!media) {
    logger.error("No media file found");
    return sendError(res, "No media file found", 400);
  }

  const { originalName, mimeType, buffer } = media;
  logger.info(`File details - ${originalName}, ${mimeType}`);

  let cloudinaryResponse;
  try {
    cloudinaryResponse = await uploadMediaBufferToCloudinary(buffer);
    logger.info("Cloudinary upload response: ", cloudinaryResponse);
  } catch (error) {
    logger.error(
      "Error uploading media to Cloudinary: ",
      error?.message || error || "Failed to upload media",
    );
    return sendError(
      res,
      error?.message || error || "Failed to upload media",
      500,
    );
  }

  const newMediaCreation = await Media.create({
    publicId: cloudinaryResponse.public_id,
    originalFilename: originalName,
    mimeType,
    url: cloudinaryResponse.secure_url,
    user: req.user._id,
  });

  if (!newMediaCreation) {
    logger.error("Failed to create media");
    return sendError(res, "Failed to create media", 500);
  }

  return sendSuccess(
    res,
    {
      mediaId: newMediaCreation._id,
      url: newMediaCreation.url,
    },
    "Media created successfully",
    201,
  );
});
