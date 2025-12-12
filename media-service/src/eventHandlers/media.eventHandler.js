import { logger } from "devdad-express-utils";
import { UserMedia } from "../models/UserMedia.model.js";
import { deleteImageFromCloudinary } from "../utils/cloudinary.utils.js";

export const handleDeletedPostEvent = async (event) => {
  console.log("Post Delete Event Called...", event);
  const { postId, mediaIds } = event;
  try {
    const mediaDocumentsToDelete = await UserMedia.find({
      _id: { $in: mediaIds },
    });

    for (const mediaDocument of mediaDocumentsToDelete) {
      await deleteImageFromCloudinary(mediaDocument.publicId);
      await UserMedia.findByIdAndDelete(mediaDocument._id);

      logger.info(
        `Deleted Media Document ${mediaDocument._id} - Relevant Post: ${postId}`,
      );
    }

    logger.info(`Deleted Media Documents for Post: ${postId}`);
  } catch (error) {
    logger.error(
      error?.message || error || "Failed to handle post delete event",
    );
  }
};
