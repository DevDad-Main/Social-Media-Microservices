import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    imageUrls: [{ type: String }],
    postType: {
      type: String,
      enum: ["text", "image", "text_with_image"],
      required: true,
    },
    likesCount: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export const Post = mongoose.model("Post", postSchema);
