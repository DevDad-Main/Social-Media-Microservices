import jwt from "jsonwebtoken";
import { RefreshToken } from "../models/RefreshToken.model.js";
import { isValidObjectId } from "mongoose";
import { AppError } from "devdad-express-utils";
import crypto from "crypto";

//#region Generate Token
export const generateTokens = async (user) => {
  try {
    if (!isValidObjectId(user._id)) {
      throw new AppError("User Not Found", 404);
    }

    const accesstoken = jwt.sign(
      {
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET,
      // { expiresIn: "20m" },
      { expiresIn: "1day" },
    );

    const refreshToken = crypto.randomBytes(40).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // await RefreshToken.create({
    //   token: refreshToken,
    //   user: user._id,
    //   expiresAt,
    // });
    //
    return { accesstoken, refreshToken };
  } catch (error) {
    throw error;
  }
};
//#endregion
