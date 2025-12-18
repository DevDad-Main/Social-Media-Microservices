import mongoose from "mongoose";

/**
 * @typedef {Object} StoryMedia
 * @property {string} publicId - Cloudinary public ID for the media file (required)
 * @property {string} originalFilename - Original uploaded filename (required)
 * @property {string} mimeType - MIME type of the media file (required)
 * @property {string} [url] - CDN URL for the media file
 * @property {mongoose.Types.ObjectId} user - ID of the user who owns this media (required)
 * @property {mongoose.Types.ObjectId} storyId - ID of the story this media belongs to (required)
 * @property {Date} createdAt - When the media was uploaded
 * @property {Date} updatedAt - When the media was last updated
 */
const storyMediaSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    storyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

/**
 * Mongoose StoryMedia Model - Manages media files associated with stories
 * @type {import('mongoose').Model<StoryMedia>}
 * @property {string} publicId - Cloudinary public ID for the media file (required)
 * @property {string} originalFilename - Original uploaded filename (required)
 * @property {string} mimeType - MIME type of the media file (required)
 * @property {string} [url] - CDN URL for the media file
 * @property {mongoose.Types.ObjectId} user - ID of the user who owns this media (required)
 * @property {mongoose.Types.ObjectId} storyId - ID of the story this media belongs to (required)
 * @property {Date} createdAt - When the media was uploaded
 * @property {Date} updatedAt - When the media was last updated
 */
export const StoryMedia = mongoose.model("StoryMedia", storyMediaSchema);
