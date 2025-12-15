import mongoose from "mongoose";


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

export const Comment = mongoose.model("Comment", commentSchema);
