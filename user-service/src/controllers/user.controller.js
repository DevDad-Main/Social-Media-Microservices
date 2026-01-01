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
import { getUserProfileAggregation } from "../utils/getUserProfileAggregation.utils.js";
import {
  clearRedisUserCache,
  clearRedisUsersSearchCache,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";
import { Connection } from "../models/Connection.model.js";
import { sendUserMediaToMediaService } from "../utils/sendUserMediaToMediaService.utils.js";

const MAX_CONNECTION_REQUESTS = 2;

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
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Registration Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
  }

  console.log("DEBUG: req.body = ", req.body);

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });

  if (existingUser) {
    logger.warn("User Already Exists");
    return sendError(res, "User Already Exists", 400);
  }

  const user = new User({
    fullName: `${firstName} ${lastName}`,
    email,
    username,
    password,
  });

  await user.save(); // NOTE: Trigger pre-save hash password hook

  if (req.files && (req.files.profile_photo || req.files.cover_photo)) {
    try {
      await sendUserMediaToMediaService(user._id.toString(), req.files, req);
    } catch (mediaError) {
      logger.error("Failed to upload media during registration:", {
        error: mediaError,
      });
      return sendError(res, mediaError.message, mediaError.status || 500, {
        mediaError,
      });
    }
  }

  await publishRabbitMQEvent("user.created", {
    userId: user._id.toString(),
    searchTerm: user.username,
    userCreatedAt: user.createdAt,
  });

  await clearRedisUsersSearchCache(req);

  // Clear any potential stale cache for this new user
  await clearRedisUserCache(req, user._id);

  return sendSuccess(res, user, "User Registered Successfully", 201);
});
//#endregion

//#region Login User
export const loginUser = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;
  console.log("DEBUG: req.body = ", req.body);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Login Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
  }

  const user = await User.findOne({ username });

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
    [
      (res) => res.cookie("accessToken", accesstoken, HTTP_OPTIONS),
      (res) => res.cookie("refreshToken", refreshToken, HTTP_OPTIONS),
    ],
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
  res
    .clearCookie("accessToken", HTTP_OPTIONS)
    .clearCookie("refreshToken", HTTP_OPTIONS);

  return sendSuccess(
    res,
    {
      success: true,
    },
    "Logout Successful",
    200,
  );
});
//#endregion

//#region Get User By Id (Frontend API Call)
export const getUserProfile = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { bust } = req.query; // Cache busting parameter for testing

  if (!id) {
    logger.warn("User Id Not Found");
    return sendError(res, "User Id Not Found", 400);
  }

  if (!isValidObjectId(id)) {
    logger.warn(`ID: ${id} is not a valid MongoDB ObjectId`);
    return sendError(res, `ID: ${id} is not a valid MongoDB ObjectId`, 400);
  }

  //NOTE: Check cache first (unless busting)
  const cacheKey = `user_profile:${id}`;
  const cachedProfile = bust ? null : await req.redisClient.get(cacheKey);
  console.log("DEBUG: cachedProfile for user ${id} = ", cachedProfile);
  console.log("DEBUG: Cache exists = ", !!cachedProfile);
  console.log("DEBUG: Cache busting = ", bust);
  
  if (cachedProfile && !bust) {
    try {
      const parsedCache = JSON.parse(cachedProfile);
      // Validate cached data has required structure before returning
      if (parsedCache && parsedCache.profile && parsedCache.profile._id) {
        return sendSuccess(
          res,
          parsedCache,
          "User Profile Fetched (cached)",
          200,
        );
      } else {
        console.log("DEBUG: Invalid cache structure, clearing and refetching");
        await req.redisClient.del(cacheKey);
      }
    } catch (parseError) {
      console.log("DEBUG: Cache parse error, clearing and refetching", parseError);
      await req.redisClient.del(cacheKey);
    }
  }

  //NOTE: Use aggregation pipeline to fetch all required data
  const [profileData] = await User.aggregate(getUserProfileAggregation(id));

  if (!profileData) {
    logger.warn("User Not Found");
    return sendError(res, "User Not Found", 404);
  }

  console.log("DEBUG: Fresh profile data fetched for user:", id);

  //NOTE: Structure the response to match frontend expectations
  const enrichedProfile = {
    profile: {
      _id: profileData._id,
      fullName: profileData.fullName,
      username: profileData.username,
      bio: profileData.bio,
      location: profileData.location,
      email: profileData.email,
      followers: profileData.followers,
      following: profileData.following,
      connections: profileData.connections,
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt,
      profile_photo: profileData.profile_photo,
      cover_photo: profileData.cover_photo,
    },
    posts: profileData.posts || [],
    likes: profileData.likedPosts || [],
  };

  //NOTE: Cache enriched profile
  await req.redisClient.set(
    cacheKey,
    JSON.stringify(enrichedProfile),
    "EX",
    300,
  ); // 5 minutes TTL

  console.log("DEBUG: Cached new profile data for user:", id);

  return sendSuccess(res, enrichedProfile, "User Profile Fetched", 200);
});
//#endregion

//#region Update User Profile Details
export const updateUserProfile = catchAsync(async (req, res, next) => {
  let { username, bio, location, fullName } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Update User Profile Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
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
  const { userId } = req.params;

  if (!userId) {
    logger.warn("User Id Not Found");
    return sendError(res, "User Id Not Found", 400);
  }

  if (!isValidObjectId(userId)) {
    logger.warn(`ID: ${userId} is not a valid MongoDB ObjectId`);
    return sendError(res, `ID: ${userId} is not a valid MongoDB ObjectId`, 400);
  }

  //NOTE: Check cache first
  const cacheKey = `user_profile:${userId}`;
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
  const profile = await User.findById(userId).select("-password");

  if (!profile) {
    logger.warn("User Not Found");
    return sendError(res, "User Not Found", 404);
  }

  const userProfilePhoto = await fetchMediaByUserId(userId);

  if (!userProfilePhoto) {
    logger.warn("User Profile Photo Not Found");
    return sendError(res, "User Profile Photo Not Found", 404);
  }

  const simplifiedUser = { ...profile.toObject() };

  const enrichedProfile = {
    fullName: simplifiedUser.fullName,
    username: simplifiedUser.username,
    profilePhoto:
      userProfilePhoto.data.type === "profile"
        ? userProfilePhoto.data.url
        : null,
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

//#region Fetch User Profiles
export const fetchUserProfiles = catchAsync(async (req, res, next) => {
  try {
    const { userIds } = req.body;

    console.log("DEBUG: userIds = ", userIds);
    if (!userIds) {
      logger.warn("User Ids Not Found");
      return sendError(res, "User Ids Not Found", 400);
    }

    if (!Array.isArray(userIds)) {
      logger.warn("User Ids is not an array");
      return sendError(res, "User Ids is not an array", 400);
    }

    const userProfiles = await User.find({ _id: { $in: userIds } }).select(
      "-password",
    );

    if (userProfiles.length === 0) {
      logger.warn("User Profiles Not Found");
      return sendError(res, "User Profiles Not Found", 404);
    }

    return sendSuccess(res, userProfiles, "User Profiles Fetched", 200);
  } catch (error) {
    logger.error("Failed to fetch user profiles", { error });
    return sendError(res, error.message, error.status || 500);
  }
});
//#endregion

//#region Send Connection Request
export const sendConnectionRequest = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.body;

  if (!isValidObjectId(userId)) return sendError(res, "Invalid user ID", 400);
  if (!isValidObjectId(id)) return sendError(res, "Invalid user ID", 400);

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const connectionRequests = await Connection.find({
    from_user_id: userId,
    createdAt: { $gte: last24Hours },
  });

  //NOTE: No magic numbers, this would be configurable dependdant on customer needs
  if (connectionRequests.length > MAX_CONNECTION_REQUESTS) {
    logger.warn("Connection Request Limit Reached");
    return sendError(res, "Connection Request Limit Reached", 400);
  }

  // Check if users are already connected
  const connection = await Connection.findOne({
    $or: [
      { from_user_id: userId, to_user_id: id },
      { from_user_id: id, to_user_id: userId },
    ],
  });

  if (!connection) {
    try {
      const newConnection = await Connection.create({
        from_user_id: userId,
        to_user_id: id,
      });

      const fromUser = await User.findById(userId);

      //NOTE: Send new notification request
      await publishRabbitMQEvent("connectionReq.sent", {
        user: id,
        from: fromUser._id,
        type: "connection",
        entityId: fromUser._id,
      });

      return sendSuccess(res, {}, "Connection Request Sent", 201);
    } catch (error) {
      logger.error("Failed to create connection", { error });
      return sendError(res, error.message, error.status || 500);
    }
    //NOTE: We will handle this in the frotnend by greying/disabling the button but just as a fail safe incase
  } else if (connection && connection.status === "accepted") {
    return sendSuccess(res, {}, "Connection Already Accepted", 200);
  }

  return sendSuccess(res, {}, "Connection Request Pending", 200);
});
//#endregion

//#region Accept Connection Request
export const acceptConnectionRequests = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.body;

    if (!isValidObjectId(userId)) return sendError(res, "Invalid user ID", 400);
    if (!isValidObjectId(id)) return sendError(res, "Invalid user ID", 400);

    const connection = await Connection.findOne({
      from_user_id: id,
      to_user_id: userId,
    });

    if (!connection) {
      logger.warn("Connection Not Found");
      return sendError(res, "Connection Not Found", 404);
    }

    // add to logged in user "connections" (no duplicates thanks to $addToSet)
    await User.findByIdAndUpdate(userId, {
      $addToSet: { connections: id },
    });

    // add to "other users connections"
    await User.findByIdAndUpdate(id, {
      $addToSet: { connections: userId },
    });

    await Connection.findByIdAndUpdate(connection._id, {
      $set: { status: "accepted" },
    });
  } catch (error) {
    logger.error("Failed to accept connection", { error });
    return sendError(res, error.message, error.status || 500, { error });
  }
});
//#endregion

//#region Get User Connections
export const getUserConnections = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!isValidObjectId(userId)) return sendError(res, "Invalid user ID", 400);

    const user = await User.findById(userId).populate(
      "connections followers following",
    );

    if (!user) {
      logger.warn(`User Not Found: ${userId}`);
      return sendError(res, `User Not Found: ${userId}`, 404);
    }

    const { connections, followers, following } = user;

    const pendingConnections = (
      await Connection.find({ to_user_id: userId, status: "pending" }).populate(
        "from_user_id",
      )
    ).map((connection) => connection.from_user_id);

    if (pendingConnections.length === 0) {
      logger.warn("No pending connections found || Something Went Wrong");
      return sendSuccess(
        res,
        { connections, followers, following },
        "User Connections Successfully Fetched",
        200,
      );
    }

    console.log(connections, followers, following, pendingConnections);

    return sendSuccess(
      res,
      { connections, followers, following, pendingConnections },
      "User Connections Successfully Fetched",
      200,
    );
  } catch (error) {
    logger.error("Failed to get user connections", { error });
    return sendError(res, error.message, error.status || 500, { error });
  }
};
//#endregion

//#region Follow User
export const followUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.body;

    if (!isValidObjectId(userId)) return sendError(res, "Invalid user ID", 400);
    if (!isValidObjectId(id)) return sendError(res, "Invalid user ID", 400);

    //NOTE: Sanity check but we can handle this on the frontend by filtering out ourself
    if (userId.toString() === id.toString()) {
      logger.warn("Cannot follow yourself");
      return sendError(res, "Cannot follow yourself", 400);
    }

    // add to "following" (no duplicates thanks to $addToSet)
    await User.findByIdAndUpdate(userId, {
      $addToSet: { following: id },
    });

    // add to "followers"
    await User.findByIdAndUpdate(id, {
      $addToSet: { followers: userId },
    });

    return sendSuccess(res, {}, "User Successfully Followed", 200);
  } catch (error) {
    logger.error("Failed to follow user", { error });
    return sendError(res, error.message, error.status || 500, { error });
  }
};
//#endregion

//#region Unfollow User
export const unfollowUser = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.body;

    if (!isValidObjectId(userId)) return sendError(res, "Invalid user ID", 400);
    if (!isValidObjectId(id)) return sendError(res, "Invalid user ID", 400);

    // Remove unfollowed user from your following
    await User.findByIdAndUpdate(userId, {
      $pull: { following: id },
    });

    // Remove you from their followers
    await User.findByIdAndUpdate(id, {
      $pull: { followers: userId },
    });

    return sendSuccess(res, {}, "User Successfully Unfollowed", 200);
  } catch (error) {
    logger.error("Failed to unfollow user", { error });
    return sendError(res, error.message, error.status || 500, { error });
  }
};
//#endregion

//#region Fetch User
export const fetchUser = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user?._id;

    if (!isValidObjectId(userId)) {
      return sendError(res, "Invalid User Id", 400, { success: false });
    }

    logger.info("DEBUG: Fetch User By Profile Id - userId = ", userId);

    const user = await User.findById(userId).select("-password");

    if (!user) {
      logger.warn("User Not Found with ID: " + userId);
      return sendError(res, "User Not Found", 404, { success: false });
    }

    const userProfilePhoto = await fetchMediaByUserId(userId);

    if (!userProfilePhoto) {
      logger.warn("User Profile Photo Not Found");
      return sendError(res, "User Profile Photo Not Found", 404);
    }

    const enrichedUser = {
      ...user.toObject(),
      profile_photo:
        userProfilePhoto.data.type === "profile"
          ? userProfilePhoto.data.url
          : null,
      cover_photo:
        userProfilePhoto.data.type === "cover"
          ? userProfilePhoto.data.url
          : null,
      success: true,
    };

    return sendSuccess(
      res,
      enrichedUser,
      "User Passed Authentication Check",
      200,
    );
  } catch (error) {
    logger.error("Failed to fetch user", { error });
    return sendError(res, error.message, error.status || 500, { error });
  }
});
//#endregion
