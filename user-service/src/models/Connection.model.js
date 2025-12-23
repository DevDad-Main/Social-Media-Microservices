import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema({
  from_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  to_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted"],
    default: "pending",
  },
});

export const Connection = mongoose.model("Connection", connectionSchema);
