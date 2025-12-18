import mongoose from "mongoose";

/**
 * @typedef {Object} SearchUser
 * @property {string} userId - Unique user identifier (required, indexed)
 * @property {string} searchTerm - Username/text for search indexing (required)
 * @property {string} userCreatedAt - Timestamp when the user was created (required)
 * @property {Date} createdAt - When this search document was created
 * @property {Date} updatedAt - When this search document was last updated
 */
const userSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    searchTerm: {
      type: String,
      required: true,
    },
    userCreatedAt: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

userSearchSchema.index({ searchTerm: "text" });
userSearchSchema.index({ userCreatedAt: -1 });

/**
 * Mongoose UserSearch Model - Indexed user data for full-text search functionality
 * @type {import('mongoose').Model<SearchUser>}
 * @property {string} userId - Unique user identifier (required, indexed)
 * @property {string} searchTerm - Username/text for search indexing (required)
 * @property {string} userCreatedAt - Timestamp when the user was created (required)
 * @property {Date} createdAt - When this search document was created
 * @property {Date} updatedAt - When this search document was last updated
 */
export const UserSearch = mongoose.model("UserSearch", userSearchSchema);
