import mongoose from "mongoose";

const postSearchSchema = new mongoose.Schema(
  {
    postId: {
      type: string,
      required: true,
      unique: true,
    },
    userId: {
      type: string,
      required: true,
      unique: true,
    },
    searchTerm: {
      type: string,
      required: true,
    },
  },
  { timestamps: true },
);

postSearchSchema.index({ searchTerm: "text" });

export const PostSearch = mongoose.model("PostSearch", postSearchSchema);
