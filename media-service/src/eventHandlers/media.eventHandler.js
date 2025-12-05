import { logger } from "devdad-express-utils";
import { Media } from "../models/Media.model.js";
import { deleteImageFromCloudinary } from "../utils/cloudinary.utils.js";

export const handleDeletedPostEvent = async (event) => {
  console.log("Post Delete Event Called...", event);
  const { postId, mediaIds } = event;
  try {
    const mediaDocumentsToDelete = await Media.find({ _id: { $in: mediaIds } });

    for (const mediaDocument of mediaDocumentsToDelete) {
      await deleteImageFromCloudinary(mediaDocument.publicId);
      await Media.findByIdAndDelete(mediaDocument._id);

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
