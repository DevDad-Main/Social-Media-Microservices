import mongoose from "mongoose";

/**
 * @typedef {Object} Story
 * @property {mongoose.Types.ObjectId} user - ID of the user who created the story (required)
 * @property {string} [content] - Story text content
 * @property {'image'|'text'|'video'} [mediaType] - Type of media content (enum: "image", "text", "video")
 * @property {string} [backgroundColour] - Background color for text-based stories
 * @property {Date} createdAt - When the story was created
 * @property {Date} updatedAt - When the story was last updated
 */
const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    content: { type: String },
    mediaType: { type: String, enum: ["image", "text", "video"] },
    backgroundColour: { type: String },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

/**
 * Mongoose Story Model - Represents user stories that expire after 24 hours
 * @type {import('mongoose').Model<Story>}
 * @property {mongoose.Types.ObjectId} user - ID of the user who created the story (required)
 * @property {string} [content] - Story text content
 * @property {'image'|'text'|'video'} [mediaType] - Type of media content (enum: "image", "text", "video")
 * @property {string} [backgroundColour] - Background color for text-based stories
 * @property {Date} createdAt - When the story was created
 * @property {Date} updatedAt - When the story was last updated
 */
export const Story = mongoose.model("Story", storySchema);
