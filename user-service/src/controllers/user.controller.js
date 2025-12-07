import { generateTokens } from "../utils/generateToken.utils.js";
import { User } from "../models/User.model.js";
import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { RefreshToken } from "../models/RefreshToken.model.js";
import { validationResult } from "express-validator";

//#region Constants
const HTTP_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};
//#endregion

//#region Register User
export const registerUser = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, username, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("Registration Validation Error: ", errors);
    return sendError(res, "Registration Validation Error", 400, errors.array());
  }

  let user = await User.findOne({ $or: [{ username }, { email }] });

  if (user) {
    logger.warn("User Already Exists");
    return sendError(res, "User Already Exists", 400);
  }

  user = new User({
    full_name: `${firstName === " " ? "First" : firstName} ${lastName === " " ? "Last" : lastName}`,
    email,
    username,
    password,
  });

  await user.save(); // NOTE: Trigger pre-save hash password hook

  return sendSuccess(res, user, "User Registered Successfully", 201);
});
//#endregion

//#region Login User
export const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("Login Validation Error: ", errors);
    return sendError(res, "Regisrtation Validation Error", 400, errors.array());
  }

  const user = await User.findOne({ email });

  if (!user) {
    logger.warn("User Not Found");
    return sendError(res, "User Not Found", 404);
  }

  const isPasswordMatching = await user.comparePassword(password);

  if (!isPasswordMatching) {
    logger.warn("Invalid Password");
    return sendError(res, "Invalid Password", 400);
  }

  const { accesstoken, refreshToken } = await generateTokens(user);

  return sendSuccess(
    res,
    {
      accesstoken,
      refreshToken,
      user: {
        username: user.username,
        _id: user._id,
      },
    },
    "Login Successful",
    200,
  )
    .cookie("accessToken", accesstoken, HTTP_OPTIONS)
    .cookie("refreshToken", refreshToken, HTTP_OPTIONS);
});
//#endregion

//#region Generate Refresh Token
export const generateRefreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn("Refresh Token Not Found");
    return sendError(res, "Refresh Token Not Found", 400);
  }

  const storedRefreshToken = await RefreshToken.findOne({
    token: refreshToken,
  });

  if (!storedRefreshToken) {
    logger.warn("Refresh Token Not Found");
    return sendError(res, "Refresh Token Not Found", 404);
  }

  if (storedRefreshToken.expiresAt < new Date()) {
    logger.warn("Refresh Token Expired");
    return sendError(res, "Refresh Token Expired", 401);
  }

  const user = await User.findById(storedRefreshToken.user);

  if (!user) {
    logger.warn("User Not Found");
    return sendError(res, "User Not Found", 404);
  }

  const { accesstoken: newAccessToken, refreshToken: newRefreshToken } =
    await generateTokens(user);

  const tokenToDelete = await RefreshToken.deleteOne({
    _id: storedRefreshToken._id,
  });

  if (tokenToDelete.deletedCount === 0) {
    logger.warn("Refresh Token Failed To Delete");
    return sendError(res, "Refresh Token Failed To Delete", 404);
  }

  return sendSuccess(
    res,
    { accesstoken: newAccessToken, refreshToken: newRefreshToken },
    "Refresh Token Generated Successfully",
    201,
  );
});
//#endregion

//#region Logout User
export const logoutUser = catchAsync(async (req, res, next) => {
  // const { refreshToken } = req.body;
  //
  // if (!refreshToken) {
  //   logger.warn("Refresh Token Not Found");
  //   return sendError(res, "Refresh Token Not Found", 400);
  // }
  //
  // const tokenToDelete = await RefreshToken.deleteOne({
  //   token: refreshToken,
  // });
  //
  // if (tokenToDelete.deletedCount === 0) {
  //   logger.warn("Refresh Token Failed To Delete");
  //   return sendError(res, "Refresh Token Failed To Delete", 404);
  // }

  return sendSuccess(res, {}, "Logout Successful", 200)
    .clearCookie("accessToken", HTTP_OPTIONS)
    .clearCookie("refreshToken", HTTP_OPTIONS);
});
//#endregion
