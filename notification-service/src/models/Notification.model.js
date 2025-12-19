import mongoose from "mongoose";

/**
 * @typedef {Object} Notification
 * @property {mongoose.Types.ObjectId} [user] - ID of recipient who is receiving the notification
 * @property {mongoose.Types.ObjectId} [from] - ID of user who is sending the notification
 * @property {enum} [type] - Type of notification - Message, Like, Comment, Connection
 * @property {mongoose.Types.ObjectId} [entityId] - Represents the entities ID - e.g messageId, postId, commentId
 * @property {boolean} read - Whether the notification has been read
 */
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    from: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      enum: ["message", "like", "comment", "connection"],
      required: true,
    },
    //NOTE: Example: messageId, postId, commentId
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/**
 * Mongoose Notification Model - Represents users notification, support for mutliple different notification types.
 * @type {import('mongoose').Model<Comment>}
 * @property {mongoose.Types.ObjectId} [user] - ID of user who is receiving the notification
 * @property {mongoose.Types.ObjectId} [from] - ID of user who is sending the notification
 * @property {enum} [type] - Type of notification - Message, Like, Comment, Connection
 * @property {mongoose.Types.ObjectId} [entityId] - Represents the entities ID - e.g messageId, postId, commentId
 * @property {boolean} read - Whether the notification has been read
 */
export const Notification = mongoose.model("Notification", notificationSchema);
