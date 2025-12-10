import mongoose from "mongoose";

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

export const Post = mongoose.model("Post", postSchema);
