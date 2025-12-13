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
import { fetchMediaByUserId } from "../utils/fetchUrlsFromMediaService.utils.js";
import { isValidObjectId } from "mongoose";
import {
  clearRedisUserCache,
  clearRedisUsersSearchCache,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";

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
    fullName: `${firstName === " " ? "First" : firstName} ${lastName === " " ? "Last" : lastName}`,
    email,
    username,
    password,
  });

  await user.save(); // NOTE: Trigger pre-save hash password hook

  await publishRabbitMQEvent("user.created", {
    userId: user._id.toString(),
    searchTerm: user.username,
    userCreatedAt: user.createdAt,
  });

  await clearRedisUsersSearchCache(req);

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

  res
    .cookie("accessToken", accesstoken, HTTP_OPTIONS)
    .cookie("refreshToken", refreshToken, HTTP_OPTIONS);
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

  await clearRedisUserCache(req, req.user._id);

  res
    .clearCookie("accessToken", HTTP_OPTIONS)
    .clearCookie("refreshToken", HTTP_OPTIONS);

  return sendSuccess(res, {}, "Logout Successful", 200);
});
//#endregion

//#region Get User By Id
export const getUserProfile = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    logger.warn("User Id Not Found");
    return sendError(res, "User Id Not Found", 400);
  }

  if (!isValidObjectId(id)) {
    logger.warn(`ID: ${id} is not a valid MongoDB ObjectId`);
    return sendError(res, `ID: ${id} is not a valid MongoDB ObjectId`, 400);
  }

  //NOTE: Check cache first
  const cacheKey = `user_profile:${id}`;
  const cachedProfile = await req.redisClient.get(cacheKey);
  if (cachedProfile) {
    return sendSuccess(
      res,
      JSON.parse(cachedProfile),
      "User Profile Fetched (cached)",
      200,
    );
  }

  //NOTE: Fetch user from DB
  const profile = await User.findById(id).select("-password");
  if (!profile) {
    logger.warn("User Not Found");
    return sendError(res, "User Not Found", 404);
  }

  //NOTE: Fetch media from MediaService
  let media = [];
  try {
    media = await fetchMediaByUserId(id);
    logger.info("Media URLS Fetched successfully", { media });
  } catch (error) {
    logger.error("Failed to fetch media:", { error });
    //NOTE: Instead of us returning an error we can just send the Profile as it is
    return sendSuccess(
      res,
      { profile },
      "User Profile Fetched But Failed To Retrieve Media URLS",
      200,
    );
  }

  //NOTE: Map profilePhoto and coverPhoto
  const mediaData = media.data || [];
  const profilePhoto = mediaData.find((m) => m.type === "profile")?.url || null;
  const coverPhoto = mediaData.find((m) => m.type === "cover")?.url || null;

  const enrichedProfile = {
    ...profile.toObject(),
    profilePhoto,
    coverPhoto,
  };

  //NOTE: Cache enriched profile
  await req.redisClient.set(
    cacheKey,
    JSON.stringify(enrichedProfile),
    "EX",
    300,
  ); // 5 minutes TTL

  return sendSuccess(res, enrichedProfile, "User Profile Fetched", 200);
});
//#endregion

//#region Update User Profile Details
export const updateUserProfile = catchAsync(async (req, res, next) => {
  let { username, bio, location, fullName } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.warn("Registration Validation Error: ", errors.array());
    return sendError(res, "Registration Validation Error", 400, errors.array());
  }
  if (!req.user) {
    logger.warn("User Not Found");
    return sendError(res, "User Not Found", 404);
  }

  if (!isValidObjectId(req.user._id)) {
    logger.warn("ID is not a valid MongoDB ObjectId");
    return sendError(res, "ID is not a valid MongoDB ObjectId", 400);
  }

  try {
    const userToUpdate = await User.findById(req.user?._id);

    if (!userToUpdate) {
      logger.warn("User Not Found");
      return sendError(res, "User Not Found", 404);
    }

    !username && (username = userToUpdate.username);
    !bio && (bio = userToUpdate.bio);
    !location && (location = userToUpdate.location);
    !fullName && (fullName = userToUpdate.fullName);

    if (userToUpdate.username !== username) {
      const usernameExists = await User.findOne({ username });

      if (usernameExists) {
        username = userToUpdate.username;
      }
    }

    userToUpdate.username = username;
    userToUpdate.bio = bio;
    userToUpdate.location = location;
    userToUpdate.fullName = fullName;

    await userToUpdate.save();

    await publishRabbitMQEvent("user.updated", {
      userId: userToUpdate._id.toString(),
      searchTerm: userToUpdate.username,
    });

    await clearRedisUserCache(req, userToUpdate._id);
    await clearRedisUsersSearchCache(req);

    return sendSuccess(
      res,
      userToUpdate,
      "User Profile Updated Successfully",
      200,
    );
  } catch (error) {
    logger.error("Failed to update user profile: ", { error });
    return sendError(res, error.message, error.status || 500);
  }
});
//#endregion

//#region Fetch User By Id
export const fetchUserById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id) {
    logger.warn("User Id Not Found");
    return sendError(res, "User Id Not Found", 400);
  }

  if (!isValidObjectId(id)) {
    logger.warn(`ID: ${id} is not a valid MongoDB ObjectId`);
    return sendError(res, `ID: ${id} is not a valid MongoDB ObjectId`, 400);
  }

  //NOTE: Check cache first
  const cacheKey = `user_profile:${id}`;
  const cachedProfile = await req.redisClient.get(cacheKey);
  if (cachedProfile) {
    return sendSuccess(
      res,
      JSON.parse(cachedProfile),
      "User Profile Fetched (cached)",
      200,
    );
  }

  //NOTE: Fetch user from DB
  const profile = await User.findById(id).select("-password");
  if (!profile) {
    logger.warn("User Not Found");
    return sendError(res, "User Not Found", 404);
  }

  //NOTE: Cache enriched profile
  await req.redisClient.set(cacheKey, JSON.stringify(profile), "EX", 300); // 5 minutes TTL

  return sendSuccess(res, profile, "User Profile Fetched", 200);
});
//#endregion
