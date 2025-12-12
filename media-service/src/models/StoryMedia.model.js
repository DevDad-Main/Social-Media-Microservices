import mongoose from "mongoose";

const storyMediaSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    storyId: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

export const StoryMedia = mongoose.model("StoryMedia", storyMediaSchema);
