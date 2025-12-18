import mongoose from "mongoose";

/**
 * @typedef {Object} Comment
 * @property {string} content - Comment text content (required)
 * @property {mongoose.Types.ObjectId} post - ID of post this comment belongs to (required)
 * @property {mongoose.Types.ObjectId} [owner] - ID of user who wrote the comment
 * @property {mongoose.Types.ObjectId} [parent] - ID of parent comment (null for top-level)
 * @property {mongoose.Types.ObjectId[]} replies - Array of reply comment IDs
 * @property {boolean} isOwner - Whether commenter is post owner (default: false)
 * @property {number} likes - Number of likes (default: 0)
 * @property {number} dislikes - Number of dislikes (default: 0)
 * @property {mongoose.Types.ObjectId[]} likedBy - Array of user IDs who liked this comment
 * @property {mongoose.Types.ObjectId[]} dislikedBy - Array of user IDs who disliked this comment
 * @property {Date} createdAt - When comment was created
 * @property {Date} updatedAt - When comment was last updated
 */
const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Comment",
    default: null, //NOTE: null = top level, otherwise it's a reply
  },
  replies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Comment" }],
  isOwner: {
    type: Boolean,
    default: false,
  },
  likes: {
    type: Number,
    default: 0
  },
  dislikes: {
    type: Number,
    default: 0
  },
  // So we can keep a track of who liked it, as above we are usuing numbers for likes, not an easy way to track if user already liked
  likedBy: [{ type: mongoose.Schema.Types.ObjectId }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId }],
}, {
  timestamps: true,
});

/**
 * Mongoose Comment Model - Represents user comments on posts with support for replies and likes
 * @type {import('mongoose').Model<Comment>}
 * @property {string} content - Comment text content (required)
 * @property {mongoose.Types.ObjectId} post - ID of post this comment belongs to (required)
 * @property {mongoose.Types.ObjectId} [owner] - ID of user who wrote the comment
 * @property {mongoose.Types.ObjectId} [parent] - ID of parent comment (null for top-level)
 * @property {mongoose.Types.ObjectId[]} replies - Array of reply comment IDs
 * @property {boolean} isOwner - Whether commenter is post owner (default: false)
 * @property {number} likes - Number of likes (default: 0)
 * @property {number} dislikes - Number of dislikes (default: 0)
 * @property {mongoose.Types.ObjectId[]} likedBy - Array of user IDs who liked this comment
 * @property {mongoose.Types.ObjectId[]} dislikedBy - Array of user IDs who disliked this comment
 * @property {Date} createdAt - When comment was created
 * @property {Date} updatedAt - When comment was last updated
 */
export const Comment = mongoose.model("Comment", commentSchema);
