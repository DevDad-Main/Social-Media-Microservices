import mongoose from "mongoose";

/**
 * @typedef {Object} PostMedia
 * @property {string[]} publicId - Array of Cloudinary public IDs for media files (required)
 * @property {string[]} originalFilenames - Array of original uploaded filenames (required)
 * @property {string} mimeType - MIME type of the media files (required)
 * @property {string[]} [urls] - Array of CDN URLs for the media files
 * @property {mongoose.Types.ObjectId} user - ID of the user who uploaded the media (required)
 * @property {mongoose.Types.ObjectId} postId - ID of the post this media belongs to (required)
 * @property {Date} createdAt - When the media was uploaded
 * @property {Date} updatedAt - When the media was last updated
 */
const postMediaSchema = new mongoose.Schema(
  {
    publicId: [{ type: String, required: true }],
    originalFilenames: [{ type: String, required: true }],
    mimeType: { type: String, required: true },
    urls: [{ type: String }],
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

/**
 * Mongoose PostMedia Model - Manages media files associated with posts
 * @type {import('mongoose').Model<PostMedia>}
 * @property {string[]} publicId - Array of Cloudinary public IDs for media files (required)
 * @property {string[]} originalFilenames - Array of original uploaded filenames (required)
 * @property {string} mimeType - MIME type of the media files (required)
 * @property {string[]} [urls] - Array of CDN URLs for the media files
 * @property {mongoose.Types.ObjectId} user - ID of the user who uploaded media (required)
 * @property {mongoose.Types.ObjectId} postId - ID of the post this media belongs to (required)
 * @property {Date} createdAt - When the media was uploaded
 * @property {Date} updatedAt - When the media was last updated
 */
export const PostMedia = mongoose.model("PostMedia", postMediaSchema);
