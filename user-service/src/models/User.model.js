import mongoose from "mongoose";
import bcrypt from "bcrypt";

/**
 * @typedef {Object} User
 * @property {string} email - User's email address (required, unique)
 * @property {string} fullName - User's full name (required)
 * @property {string} username - User's unique username (required, unique)
 * @property {string} password - User's hashed password (required)
 * @property {string} [bio] - User's biography (default: "Hey there! I'm using Knect.")
 * @property {string} [location] - User's location (default: "")
 * @property {mongoose.Types.ObjectId[]} [followers] - Array of user IDs who follow this user
 * @property {mongoose.Types.ObjectId[]} [following] - Array of user IDs this user follows
 * @property {mongoose.Types.ObjectId[]} [connections] - Array of user IDs this user is connected to
 * @property {string} [refreshToken] - Current refresh token for the user
 * @property {Date} createdAt - When the user was created
 * @property {Date} updatedAt - When the user was last updated
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "Hey there! I'm using Knect.",
    },
    location: {
      type: String,
      default: "",
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    connections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

//#region Pre-Save Hook
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    try {
      const salt = await bcrypt.genSalt(12);
      this.password = await bcrypt.hash(this.password, salt);
    } catch (error) {
      return next(error);
    }
  }
});
//#endregion

//#region comparePassword Method
userSchema.methods.comparePassword = async function (passwordToCompare) {
  try {
    return await bcrypt.compare(passwordToCompare, this.password);
  } catch (error) {
    throw error;
  }
};
//#endregion

userSchema.index({ username: "text" });

userSchema.index({
  username: "text",
  fullName: "text",
  email: "text",
  location: "text",
});

/**
 * Mongoose User Model - Represents user accounts with authentication and social features
 * @type {import('mongoose').Model<User>}
 * @property {string} email - User's email address (required, unique)
 * @property {string} fullName - User's full name (required)
 * @property {string} username - User's unique username (required, unique)
 * @property {string} password - User's hashed password (required)
 * @property {string} [bio] - User's biography (default: "Hey there! I'm using Knect.")
 * @property {string} [location] - User's location (default: "")
 * @property {mongoose.Types.ObjectId[]} [followers] - Array of user IDs who follow this user
 * @property {mongoose.Types.ObjectId[]} [following] - Array of user IDs this user follows
 * @property {mongoose.Types.ObjectId[]} [connections] - Array of user IDs this user is connected to
 * @property {string} [refreshToken] - Current refresh token for the user
 * @property {Date} createdAt - When the user was created
 * @property {Date} updatedAt - When the user was last updated
 */
export const User = mongoose.model("User", userSchema);
