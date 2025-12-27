import mongoose from "mongoose";

/**
 * @typedef {Object} Post
 * @property {mongoose.Types.ObjectId} user - ID of the user who created the post (required)
 * @property {string} [content] - Post text content/caption
 * @property {'text'|'image'|'text_with_image'} postType - Type of post content (enum: "text", "image", "text_with_image")
 * @property {mongoose.Types.ObjectId[]} [likesCount] - Array of user IDs who liked this post
 * @property {Date} createdAt - When the post was created
 * @property {Date} updatedAt - When the post was last updated
 */
const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    content: { type: String },
    postType: {
      type: String,
      enum: ["text", "image", "text_with_image"],
      required: true,
    },
    likesCount: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  {
    timestamps: true,
    minimize: false,
  },
);

postSchema.index({ createdAt: -1 });

/**
 * Mongoose Post Model - Represents user posts with support for text and image content
 * @type {import('mongoose').Model<Post>}
 * @property {mongoose.Types.ObjectId} user - ID of the user who created the post (required)
 * @property {string} [content] - Post text content/caption
 * @property {'text'|'image'|'text_with_image'} postType - Type of post content (enum: "text", "image", "text_with_image")
 * @property {mongoose.Types.ObjectId[]} [likesCount] - Array of user IDs who liked this post
 * @property {Date} createdAt - When the post was created
 * @property {Date} updatedAt - When the post was last updated
 */
export const Post = mongoose.model("Post", postSchema);
