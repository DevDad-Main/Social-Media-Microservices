import mongoose from "mongoose";

const userSearchSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    searchTerm: {
      type: String,
      required: true,
    },
    userCreatedAt: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

userSearchSchema.index({ searchTerm: "text" });
userSearchSchema.index({ userCreatedAt: -1 });

export const UserSearch = mongoose.model("UserSearch", userSearchSchema);
