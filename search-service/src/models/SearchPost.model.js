import mongoose from "mongoose";

/**
 * @typedef {Object} SearchPost
 * @property {string} postId - Unique post identifier (required, unique)
 * @property {string} userId - ID of the user who created the post (required, indexed)
 * @property {string} searchTerm - Text content for search indexing (required)
 * @property {string} postCreatedAt - Timestamp when the post was created (required)
 * @property {Date} createdAt - When this search document was created
 * @property {Date} updatedAt - When this search document was last updated
 */
const postSearchSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    searchTerm: {
      type: String,
      required: true,
    },
    postCreatedAt: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

postSearchSchema.index({ searchTerm: "text" });
postSearchSchema.index({ postCreatedAt: -1 });

/**
 * Mongoose PostSearch Model - Indexed post data for full-text search functionality
 * @type {import('mongoose').Model<SearchPost>}
 * @property {string} postId - Unique post identifier (required, unique)
 * @property {string} userId - ID of the user who created the post (required, indexed)
 * @property {string} searchTerm - Text content for search indexing (required)
 * @property {string} postCreatedAt - Timestamp when the post was created (required)
 * @property {Date} createdAt - When this search document was created
 * @property {Date} updatedAt - When this search document was last updated
 */
export const PostSearch = mongoose.model("PostSearch", postSearchSchema);
