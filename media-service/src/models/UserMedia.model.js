import mongoose from "mongoose";

/**
 * @typedef {Object} UserMedia
 * @property {string} publicId - Cloudinary public ID for the media file (required)
 * @property {string} originalFilename - Original uploaded filename (required)
 * @property {string} mimeType - MIME type of the media file (required)
 * @property {string} url - CDN URL for the media file (required)
 * @property {mongoose.Types.ObjectId} user - ID of the user who owns this media (required)
 * @property {'profile'|'cover'} [type] - Type of user media (enum: "profile", "cover")
 * @property {Date} createdAt - When the media was uploaded
 * @property {Date} updatedAt - When the media was last updated
 */
const mediaSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["profile", "cover"] },
  },
  { timestamps: true },
);

mediaSchema.index({ user: 1, type: 1, createdAt: -1 });

/**
 * Mongoose UserMedia Model - Manages profile and cover photos for users
 * @type {import('mongoose').Model<UserMedia>}
 * @property {string} publicId - Cloudinary public ID for the media file (required)
 * @property {string} originalFilename - Original uploaded filename (required)
 * @property {string} mimeType - MIME type of the media file (required)
 * @property {string} url - CDN URL for the media file (required)
 * @property {mongoose.Types.ObjectId} user - ID of the user who owns this media (required)
 * @property {'profile'|'cover'} [type] - Type of user media (enum: "profile", "cover")
 * @property {Date} createdAt - When the media was uploaded
 * @property {Date} updatedAt - When the media was last updated
 */
export const UserMedia = mongoose.model("UserMedia", mediaSchema);
