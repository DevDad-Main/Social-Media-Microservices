import { generateTokens } from "../utils/generateToken.utils.js";
import { User } from "../models/User.model.js";
import {
  validateRegistration,
  validateLogin,
} from "../utils/validation.utils.js";
import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import { RefreshToken } from "../models/RefreshToken.model.js";

//#region Register User
export const registerUser = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;
  const { error } = validateRegistration(req.body);

  if (error) {
    logger.warn("Registration Validation Error: ", error.details[0].message);
    return sendError(res, error.details[0].message, 400);
  }

  let user = await User.findOne({ $or: [{ username }, { email }] });

  if (user) {
    logger.warn("User Already Exists");
    return sendError(res, "User Already Exists", 400);
  }

  user = new User({
    username,
    email,
    password,
  });

  await user.save(); // NOTE: Trigger pre-save hook

  return sendSuccess(res, {}, "User Registered Successfully", 201);
});
//#endregion

//#region Login User
export const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const { error } = validateLogin(req.body);

  if (error) {
    logger.warn("Login Validation Error: ", error.details[0].message);
    return sendError(res, error.details[0].message, 400);
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
    { accesstoken, refreshToken, userId: user._id },
    "Login Successful",
    200,
  );
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
  const { refreshToken } = req.body;

  if (!refreshToken) {
    logger.warn("Refresh Token Not Found");
    return sendError(res, "Refresh Token Not Found", 400);
  }

  const tokenToDelete = await RefreshToken.deleteOne({
    token: refreshToken,
  });

  if (tokenToDelete.deletedCount === 0) {
    logger.warn("Refresh Token Failed To Delete");
    return sendError(res, "Refresh Token Failed To Delete", 404);
  }

  return sendSuccess(res, {}, "Logout Successful", 200);
});
//#endregion
