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
import mongoose, { isValidObjectId } from "mongoose";
import { getUserProfileAggregation } from "../utils/getUserProfileAggregation.utils.js";
import {
  clearRedisUserCache,
  clearRedisUserConnectionsCache,
  clearRedisConnectionsCacheForMultipleUsers,
} from "../utils/cleanRedisCache.utils.js";
import { publishEvent as publishRabbitMQEvent } from "../utils/rabbitmq.utils.js";
import { Connection } from "../models/Connection.model.js";
import { sendUserMediaToMediaService } from "../utils/sendUserMediaToMediaService.utils.js";
import { getUsersSearchAggregation } from "../utils/getUsersSearchAggregation.utils.js";
import { getUserConnectionsAggregation } from "../utils/getUserConnectionsAggregation.utils.js";
import {
  checkOTPRestrictions,
  sendOTP,
  sendWelcomeEmail,
  trackOTPRequests,
  verifyOTP,
} from "../utils/userAuthentication.utils.js";
import {
  createRegistrationSession,
  deleteRegistrationSession,
  getRegistrationSession,
  reconstructFiles,
} from "../utils/registrationSession.utils.js";
import { OAuth2Client } from "google-auth-library";
import { v7 as uuidv7 } from "uuid";
import bcrypt from "bcrypt";
import { StreamChat } from "stream-chat";

//#region Constants
const SALT_ROUNDS = 12;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const MAX_CONNECTION_REQUESTS = 2;
const HTTP_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
};

const client = new OAuth2Client(CLIENT_ID);

// Initialize Stream Chat server client
const streamChatClient = StreamChat.getInstance(
  process.env.STREAM_CHAT_API_KEY,
  process.env.STREAM_CHAT_SECRET_KEY,
);
//#endregion

//#region Create User Via Google
export const createUserAccountWithGoogle = catchAsync(async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return sendError(res, "Google credential is required", 400);
  }

  // Verify Google credentials
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name } = payload;

  // Generate a random password for the user
  const password = uuidv7();
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Find or create user
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      username: email.split("@")[0],
      fullName: name,
      email,
      password: hashedPassword,
      authProvider: "google",
      isVerified: true,
    });

    // Send welcome email
    await sendWelcomeEmail(user.fullName, user.email);
  }

  // Clear any potential stale cache for this new user
  await clearRedisUserCache(req, user._id);

  // Generate JWT token
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

//#region Register User - Step 1: Store Data & Send OTP
export const registerUser = catchAsync(async (req, res, next) => {
  const { firstName, lastName, email, username, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Registration Validation Error", {
      errorMessages,
      email,
      username,
    });
    return sendError(res, errorMessages.join(", "), 400);
  }

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    logger.warn("User Already Exists", {
      email,
      username,
      existingUserId: existingUser._id,
    });
    return sendError(res, "User Already Exists", 400);
  }

  try {
    await checkOTPRestrictions(email, next);
    await trackOTPRequests(email, next);
  } catch (error) {
    logger.error("OTP restrictions check failed", {
      email,
      error: error.message,
    });
    return sendError(res, error.message, error.statusCode || 400);
  }

  //  Store registration data in Redis with secure token
  const userData = {
    firstName,
    lastName,
    email,
    username,
    password,
  };

  let registrationToken;
  try {
    registrationToken = await createRegistrationSession(userData, req.files);
    logger.info("Registration session created", {
      registrationToken: registrationToken.substring(0, 8) + "...",
      email,
      username,
    });
  } catch (error) {
    logger.error("Failed to create registration session", {
      email,
      error: error.message,
    });
    return sendError(
      res,
      "Failed to process registration. Please try again.",
      500,
    );
  }

  const userFullName = `${firstName} ${lastName}`;
  try {
    await sendOTP(userFullName, email);
    logger.info("OTP sent successfully", {
      email,
      registrationToken: registrationToken.substring(0, 8) + "...",
    });
  } catch (error) {
    // Clean up session if OTP sending fails
    await deleteRegistrationSession(registrationToken);
    logger.error("Failed to send OTP, session cleaned up", {
      email,
      error: error.message,
    });
    return sendError(
      res,
      "Failed to send verification email. Please try again.",
      500,
    );
  }

  return sendSuccess(
    res,
    {
      registrationToken,
      message: "Please check your email for the verification code.",
      expiresIn: "30 minutes",
    },
    "Registration initiated. Please verify your email.",
    201,
  );
});
//#endregion

//#region Verify User OTP - Step 2: Complete Registration
export const verifyUserOTP = catchAsync(async (req, res, next) => {
  console.log("DEBUG: req.body =", req.body);
  console.log("DEBUG: req.headers =", JSON.stringify(req.headers, null, 2));

  const errors = validationResult(req);

  // Early validation error check
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("OTP Verification Validation Error", {
      errorMessages,
      registrationToken: req.body?.registrationToken?.substring(0, 8) + "...",
      body: req.body,
    });
    return sendError(res, errorMessages.join(", "), 400);
  }

  const body = req.body || {};
  const { registrationToken, otp } = body;

  // Validate that required fields are present
  if (!registrationToken) {
    logger.error("Missing registrationToken in request body", { body });
    return sendError(res, "Registration token is required.", 400);
  }

  if (!otp) {
    logger.error("Missing otp in request body", { body });
    return sendError(res, "OTP is required.", 400);
  }

  console.log(
    "DEBUG: Verification request - Token:",
    registrationToken?.substring(0, 8) + "...",
    "OTP:",
    otp,
  );

  //  Retrieve registration data from Redis
  let registrationSession;
  try {
    registrationSession = await getRegistrationSession(registrationToken);
  } catch (error) {
    logger.error("Failed to retrieve registration session", {
      registrationToken: registrationToken?.substring(0, 8) + "...",
      error: error.message,
    });
    return sendError(res, error.message, error.statusCode || 400);
  }

  const { userData, files } = registrationSession;
  const { firstName, lastName, email, username, password } = userData;
  const userFullName = `${firstName} ${lastName}`;

  let isVerified;
  try {
    isVerified = await verifyOTP(email, otp);
    logger.info("OTP verification successful", {
      email,
      registrationToken: registrationToken.substring(0, 8) + "...",
    });
  } catch (error) {
    logger.error("OTP verification failed", {
      email,
      registrationToken: registrationToken.substring(0, 8) + "...",
      error: error.message,
    });
    return sendError(res, error.message, error.statusCode || 400);
  }

  let user;
  try {
    user = new User({
      fullName: userFullName,
      email,
      username,
      password,
      isVerified,
      authProvider: "local",
    });

    await user.save(); // NOTE: Trigger pre-save hash password hook if not already hashed
    logger.info("User created successfully", {
      userId: user._id,
      email,
      username,
    });
  } catch (error) {
    logger.error("Failed to create user", {
      email,
      username,
      error: error.message,
    });
    // Clean up session on user creation failure
    await deleteRegistrationSession(registrationToken);
    return sendError(
      res,
      "Failed to create user account. Please try registration again.",
      500,
    );
  }

  if (files) {
    try {
      // Reconstruct files from session data
      const reconstructedFiles = reconstructFiles(files);
      if (reconstructedFiles) {
        await sendUserMediaToMediaService(
          user._id.toString(),
          reconstructedFiles,
          req,
        );
        logger.info("Media files uploaded successfully", { userId: user._id });
      }
    } catch (mediaError) {
      logger.error("Failed to upload media during registration:", {
        userId: user._id,
        error: mediaError,
      });
      // Clean up user and session on media upload failure
      await User.findByIdAndDelete(user._id);
      await deleteRegistrationSession(registrationToken);
      return sendError(
        res,
        "Failed to upload media files. Please try registration again.",
        500,
      );
    }
  }

  try {
    // Publish user creation event
    await publishRabbitMQEvent("user.created", {
      userId: user._id.toString(),
      searchTerm: user.username,
      userCreatedAt: user.createdAt,
    });

    // Send welcome email
    await sendWelcomeEmail(user.fullName, user.email);

    // Clear any potential stale cache for this new user
    await clearRedisUserCache(req, user._id);

    logger.info("Post-registration tasks completed", { userId: user._id });
  } catch (error) {
    // Log error but don't fail the registration
    logger.error("Post-registration tasks failed", {
      userId: user._id,
      error: error.message,
    });
  }

  try {
    await deleteRegistrationSession(registrationToken);
    logger.info("Registration session cleaned up", {
      registrationToken: registrationToken.substring(0, 8) + "...",
    });
  } catch (error) {
    logger.error("Failed to clean up registration session", {
      registrationToken: registrationToken.substring(0, 8) + "...",
      error: error.message,
    });
  }

  return sendSuccess(
    res,
    {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      message: "Registration completed successfully! Welcome aboard!",
    },
    "User Registered Successfully",
    201,
  );
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
  return sendSuccess(res, {}, "Logout Successful", 200, [
    (res) => res.clearCookie("accessToken"),
    (res) => res.clearCookie("refreshToken"),
  ]);
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
      console.log(
        "DEBUG: Cache parse error, clearing and refetching",
        parseError,
      );
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

  console.log("DEBUG: Enriched profile data:", enrichedProfile);

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

  const simplifiedUser = { ...profile.toObject() };

  // Find profile photo from media array (if exists)
  const profileMedia = Array.isArray(userProfilePhoto)
    ? userProfilePhoto.find((media) => media.type === "profile")
    : null;

  const enrichedProfile = {
    fullName: simplifiedUser.fullName,
    username: simplifiedUser.username,
    profilePhoto: profileMedia ? profileMedia.url : null,
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

      // Clear connections cache for the user who received the request (pending connections changed)
      await clearRedisUserConnectionsCache(req, id);

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

    // Clear connections cache for both users
    await clearRedisConnectionsCacheForMultipleUsers(req, [
      userId.toString(),
      id.toString(),
    ]);
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
    const { bust } = req.query; // Cache busting parameter for testing

    if (!isValidObjectId(userId)) return sendError(res, "Invalid user ID", 400);

    // Check cache first (unless busting)
    const cacheKey = `user_connections:${userId}`;
    const cachedConnections = bust ? null : await req.redisClient.get(cacheKey);

    if (cachedConnections && !bust) {
      try {
        const parsedCache = JSON.parse(cachedConnections);
        // Validate cached data has required structure before returning
        if (
          parsedCache &&
          (parsedCache.connections ||
            parsedCache.followers ||
            parsedCache.following)
        ) {
          return sendSuccess(
            res,
            parsedCache,
            "User Connections Fetched (cached)",
            200,
          );
        } else {
          console.log(
            "DEBUG: Invalid cache structure, clearing and refetching",
          );
          await req.redisClient.del(cacheKey);
        }
      } catch (parseError) {
        console.log(
          "DEBUG: Cache parse error, clearing and refetching",
          parseError,
        );
        await req.redisClient.del(cacheKey);
      }
    }

    // Use aggregation pipeline to fetch user connections with profile photos
    const [userData] = await User.aggregate(
      getUserConnectionsAggregation(userId),
    );

    if (!userData) {
      logger.warn(`User Not Found: ${userId}`);
      return sendError(res, `User Not Found: ${userId}`, 404);
    }

    let pendingConnections = [];

    try {
      // Get pending connections and convert to plain objects
      pendingConnections = await Connection.aggregate([
        {
          $match: {
            to_user_id: new mongoose.Types.ObjectId(userId),
            status: "pending",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "from_user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $lookup: {
            from: "usermedias",
            let: { uid: "$user._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$user", "$$uid"] },
                      { $eq: ["$type", "profile"] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { _id: 0, url: 1 } },
            ],
            as: "profile_media",
          },
        },

        {
          $addFields: {
            profile_photo: {
              $ifNull: [{ $arrayElemAt: ["$profile_media.url", 0] }, null],
            },
          },
        },

        {
          $project: {
            _id: "$user._id",
            fullName: "$user.fullName",
            username: "$user.username",
            email: "$user.email",
            bio: "$user.bio",
            location: "$user.location",
            createdAt: "$user.createdAt",
            updatedAt: "$user.updatedAt",
            profile_photo: 1,
          },
        },
      ]);
      console.log("DEBUG: pendingConnections = ", pendingConnections);
    } catch (error) {
      logger.error(error.message || "Failed to get pending connections", {
        error,
      });
      return sendError(res, error.message, error.status || 500, { error });
    }

    const connectionsData = {
      connections: userData.connections || [],
      followers: userData.followers || [],
      following: userData.following || [],
    };

    if (pendingConnections.length === 0) {
      logger.warn("No pending connections found || Something Went Wrong");

      // Cache the result
      await req.redisClient.set(
        cacheKey,
        JSON.stringify(connectionsData),
        "EX",
        600,
      ); // 10 minutes TTL

      return sendSuccess(
        res,
        connectionsData,
        "User Connections Successfully Fetched",
        200,
      );
    }

    const fullData = {
      ...connectionsData,
      pendingConnections: pendingConnections || [],
    };

    // Cache the full result
    await req.redisClient.set(cacheKey, JSON.stringify(fullData), "EX", 600); // 10 minutes TTL

    return sendSuccess(
      res,
      fullData,
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

    // Clear connections cache for both users
    await clearRedisConnectionsCacheForMultipleUsers(req, [
      userId.toString(),
      id.toString(),
    ]);

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

    // Clear connections cache for both users
    await clearRedisConnectionsCacheForMultipleUsers(req, [
      userId.toString(),
      id.toString(),
    ]);

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

    const userMedia = await fetchMediaByUserId(userId);

    // Handle empty media array for new users
    const mediaArray = Array.isArray(userMedia.data) ? userMedia.data : [];

    const profileMedia = mediaArray.find((media) => media.type === "profile");
    const coverMedia = mediaArray.find((media) => media.type === "cover");

    const enrichedUser = {
      ...user.toObject(),
      profile_photo: profileMedia ? profileMedia.url : null,
      cover_photo: coverMedia ? coverMedia.url : null,
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

//#region Search Users
export const usersSearch = catchAsync(async (req, res, next) => {
  const { query } = req.query;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    logger.warn("Registration Validation Error: ", { errorMessages });
    return sendError(res, errorMessages.join(", "), 400);
  }

  console.log("Searching for users with query: ", { query });
  console.log("REQ.BODY", { body: req.body });

  if (!query) {
    logger.warn("Missing query parameter");
    return sendError(res, "Missing query parameter", 400);
  }

  const cacheKey = `users-search:${query}`;
  const cachedPostsSearch = await req.redisClient.get(cacheKey);

  if (cachedPostsSearch) {
    return sendSuccess(
      res,
      JSON.parse(cachedPostsSearch),
      "User Searches retrieved successfully",
      200,
    );
  }

  const users = await User.aggregate(
    getUsersSearchAggregation(query, req.user._id),
  );

  // Finding all users that match the search request
  // const users = await User.find({
  //   // _id: { $ne: req.user._id }, // Not Equal to operator, we exclude the logged in user
  //   $or: [
  //     { username: { $regex: query, $options: "i" } },
  //     { email: { $regex: query, $options: "i" } },
  //     { fullName: { $regex: query, $options: "i" } },
  //     { location: { $regex: query, $options: "i" } },
  //   ],
  // }).limit(20);

  logger.info(`Searched for ${query} and got ${users.length} results: `, users);

  // NOTE: We cache the Post Search results for roughly 2-3 mins
  await req.redisClient.set(cacheKey, JSON.stringify(users), "EX", 180);

  return sendSuccess(res, users, "User Searches retrieved successfully", 200);
});
//#endregion

//#region Generate Stream Chat Token
export const generateStreamChatToken = catchAsync(async (req, res, next) => {
  const { userId, username, name, image } = req.body;

  if (!userId || !username) {
    return sendError(res, "userId and username are required", 400);
  }

  // const errors = validationResult(req);
  //
  // if (!errors.isEmpty()) {
  //   const errorMessages = errors.array().map((error) => error.msg);
  //   logger.warn("Stream Chat Token Validation Error: ", {
  //     errorMessages,
  //   });
  //   return sendError(res, errorMessages.join(", "), 400);
  // }

  // Verify user is authenticated
  const currentUser = req.user;

  if (!currentUser || currentUser._id.toString() !== userId) {
    logger.warn("Stream Chat token generation: Unauthorized user", {
      requestedUserId: userId,
      authenticatedUserId: currentUser?._id,
    });
    return sendError(res, "Unauthorized", 401);
  }

  try {
    // Generate Stream Chat token
    const token = streamChatClient.createToken(userId);

    logger.info("Stream Chat token generated successfully", {
      userId,
      username,
      token,
    });

    return sendSuccess(
      res,
      { token },
      "Stream Chat token generated successfully",
      200,
    );
  } catch (error) {
    logger.error("Stream Chat token generation failed", {
      userId,
      error: error.message,
    });
    return sendError(
      res,
      error.message || "Failed to generate Stream Chat token",
      500,
    );
  }
});
//#endregion
