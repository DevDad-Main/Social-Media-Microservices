import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    originalFilename: { type: String, required: true },
    mimeType: { type: String, required: true },
    url: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ["profile", "cover"] },
  },
  { timestamps: true },
);

export const UserMedia = mongoose.model("UserMedia", mediaSchema);
