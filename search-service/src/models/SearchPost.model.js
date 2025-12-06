import mongoose from "mongoose";

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
      unique: true,
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

export const PostSearch = mongoose.model("PostSearch", postSearchSchema);
