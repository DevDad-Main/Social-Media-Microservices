import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    content: { type: String },
    mediaType: { type: String, enum: ["image", "text", "video"] },
    backgroundColour: { type: String },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

export const Story = mongoose.model("Story", storySchema);
