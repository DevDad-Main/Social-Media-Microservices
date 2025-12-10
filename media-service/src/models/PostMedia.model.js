import mongoose from "mongoose";

const postMediaSchema = new mongoose.Schema(
  {
    publicId: [{ type: String, required: true }],
    originalFilenames: [{ type: String, required: true }],
    mimeType: { type: String, required: true },
    urls: [{ type: String }],
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    postId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

export const PostMedia = mongoose.model("PostMedia", postMediaSchema);
