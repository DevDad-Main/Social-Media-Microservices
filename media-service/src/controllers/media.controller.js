//#region Imports
import {
  catchAsync,
  logger,
  sendError,
  sendSuccess,
} from "devdad-express-utils";
import {
  uploadSingleMedia,
  uploadPostsMedia,
  uploadUpdatedUserMediaAndDeleteOriginal,
} from "../utils/cloudinary.utils.js";
import { Media } from "../models/Media.model.js";
import { isValidObjectId } from "mongoose";
import {
  clearRedisPostsCache,
  clearRedisPostsSearchCache,
} from "../utils/cleanRedisCache.utils.js";
//#endregion

const fetchMediaForAUserAndFindAProperty = async (req, mediaType) => {
  const userMedia = await Media.find({ user: req.user._id });

  if (userMedia.length === 0) {
    return null;
  }

  return (
    userMedia.find(
      (m) => m.type === mediaType && m.url.includes("cloudinary"),
    ) || null
  );
};

//#region Upload Users Profile Media Controller
export const uploadUsersProfileMedia = catchAsync(async (req, res, next) => {
  const { profile_photo_type, cover_photo_type } = req.body;

  const profilePhoto = req.files?.profile_photo?.[0];
  const coverPhoto = req.files?.cover_photo?.[0];

  if (!profilePhoto && !coverPhoto) {
    logger.warn("At least one photo (profile or cover) is required");
    return sendError(
      res,
      "At least one photo (profile or cover) is required",
      400,
    );
  }

  if (profilePhoto && !profile_photo_type) {
    logger.warn("Profile photo provided but missing Profile Type");
    return sendError(
      res,
      "Profile photo provided but missing Profile Type",
      400,
    );
  }

  if (coverPhoto && !cover_photo_type) {
    logger.warn("Cover photo provided but missing Cover Type");
    return sendError(res, "Cover photo provided but missing Cover Type", 400);
  }

  if (profilePhoto && profile_photo_type !== "profile") {
    logger.warn("Profile Type is not equal to 'profile'");
    return sendError(res, "Profile Type is not equal to 'profile'", 400);
  }

  if (coverPhoto && cover_photo_type !== "cover") {
    logger.warn("Cover Type is not equal to 'cover'");
    return sendError(res, "Cover Type is not equal to 'cover'", 400);
  }

  try {
    const result = {
      user: {
        _id: req.user._id,
      },
    };

    if (profilePhoto) {
      const profileMedia = await uploadSingleMedia(
        profilePhoto,
        req.user._id,
        profile_photo_type,
      );
      result.profile = {
        mediaId: profileMedia._id,
        url: profileMedia.url,
      };
    }

    if (coverPhoto) {
      const coverMedia = await uploadSingleMedia(
        coverPhoto,
        req.user._id,
        cover_photo_type,
      );
      result.cover = {
        mediaId: coverMedia._id,
        url: coverMedia.url,
      };
    }

    // Clear relevant caches when user media is uploaded
    await clearRedisUserMediaCache(req, req.user._id);
    await clearRedisUserProfileCache(req, req.user._id);

    return sendSuccess(res, result, "Media uploaded successfully", 201);
  } catch (error) {
    logger.error("Upload error:", error.message);
    return sendError(res, error.message, 500);
  }
});
//#endregion

//#region Upload Updated User Profile Media Controller
export const uploadUpdatedUserProfileMedia = catchAsync(
  async (req, res, next) => {
    const { profile_photo_type, cover_photo_type } = req.body;

    const profilePhoto = req.files?.profile_photo?.[0];
    const coverPhoto = req.files?.cover_photo?.[0];

    if (!profilePhoto && !coverPhoto) {
      logger.warn("At least one photo (profile or cover) is required");
      return sendError(
        res,
        "At least one photo (profile or cover) is required",
        400,
      );
    }

    if (profilePhoto && !profile_photo_type) {
      logger.warn("Profile photo provided but missing Profile Type");
      return sendError(
        res,
        "Profile photo provided but missing Profile Type",
        400,
      );
    }

    if (coverPhoto && !cover_photo_type) {
      logger.warn("Cover photo provided but missing Cover Type");
      return sendError(res, "Cover photo provided but missing Cover Type", 400);
    }

    if (profilePhoto && profile_photo_type !== "profile") {
      logger.warn("Profile Type is not equal to 'profile'");
      return sendError(res, "Profile Type is not equal to 'profile'", 400);
    }

    if (coverPhoto && cover_photo_type !== "cover") {
      logger.warn("Cover Type is not equal to 'cover'");
      return sendError(res, "Cover Type is not equal to 'cover'", 400);
    }

    try {
      let originalProfilePhoto = await fetchMediaForAUserAndFindAProperty(
        req,
        "profile",
      );
      console.log(originalProfilePhoto);

      let originalCoverPhoto = await fetchMediaForAUserAndFindAProperty(
        req,
        "cover",
      );
      console.log(originalCoverPhoto);

      const result = {
        user: {
          _id: req.user._id,
        },
      };

      // Handle profile photo
      if (profilePhoto) {
        try {
          if (originalProfilePhoto) {
            const profileMedia = await uploadUpdatedUserMediaAndDeleteOriginal(
              originalProfilePhoto.publicId,
              profilePhoto,
              req.user._id,
              profile_photo_type,
            );
            result.profile = {
              mediaId: profileMedia._id,
              url: profileMedia.url,
            };
          }
        } catch (error) {
          logger.error("Failed to upload profile photo: ", { error });
          return sendError(res, error.message, 500);
        }
      } else {
        result.profile = {
          mediaId: originalProfilePhoto._id,
          url: originalProfilePhoto.url,
        };
      }

      // Handle cover photo
      if (coverPhoto) {
        try {
          if (originalCoverPhoto) {
            const coverMedia = await uploadUpdatedUserMediaAndDeleteOriginal(
              originalCoverPhoto.publicId,
              coverPhoto,
              req.user._id,
              cover_photo_type,
            );
            result.cover = {
              mediaId: coverMedia._id,
              url: coverMedia.url,
            };
          }
        } catch (error) {
          logger.error("Failed to upload cover photo: ", { error });
          return sendError(res, error.message, 500);
        }
      } else {
        result.cover = {
          mediaId: originalCoverPhoto._id,
          url: originalCoverPhoto.url,
        };
      }

      // Clear relevant caches when user media is updated
      await clearRedisUserMediaCache(req, req.user._id);
      await clearRedisUserProfileCache(req, req.user._id);

      return sendSuccess(res, result, "Media uploaded successfully", 201);
    } catch (error) {
      logger.error("Upload error:", error.message);
      return sendError(res, error.message, 500);
    }
  },
);
//#endregion

//#region Fetch User Media
export const fetchUserMedia = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    logger.warn("User Id Not Found");
    return sendError(res, "User Id Not Found", 400);
  }

  if (!isValidObjectId(userId)) {
    logger.warn(`ID: ${userId} is not a valid MongoDB ObjectId`);
    return sendError(res, `ID: ${userId} is not a valid MongoDB ObjectId`, 400);
  }

  const media = await Media.find({ user: userId });

  if (media.length === 0) {
    logger.warn("No Media Found", 404);
    return sendError(res, "No Media Found", 400);
  }

  return sendSuccess(res, media, "Media Fetched Successfully", 200);
});
//#endregion

//#region Upload Post Media
export const uploadPostMedia = catchAsync(async (req, res, next) => {
  const { postId } = req.body;
  const images = req.files?.images || [];

  if (!postId) {
    logger.warn(`Post Id Not Found: ${postId}`);
    return sendError(res, "Post Id Not Found", 400);
  }

  if (!isValidObjectId(postId)) {
    logger.warn(`ID: ${postId} is not a valid MongoDB ObjectId`);
    return sendError(res, `ID: ${postId} is not a valid MongoDB ObjectId`, 400);
  }

  if (images.length === 0) {
    logger.warn("At least one image is required");
    return sendError(res, "At least one image is required", 400);
  }

  try {
    const result = {};

    if (images && images.length > 0) {
      try {
        logger.info("About to call uploadPostsMedia with postId:", postId);
        const postImages = await uploadPostsMedia(images, postId, "post");
        logger.info("uploadPostsMedia returned:", postImages);

        if (!postImages) {
          logger.warn("postImages is undefined after uploadPostsMedia");
          return sendError(res, "Failed to upload post images", 500);
        }

        result.media = {
          urls: postImages.urls,
        };
      } catch (error) {
        logger.error("Upload error:", { error });
        return sendError(res, error.message, 500);
      }
    }

    // Clear relevant caches when user media is uploaded
    await clearRedisPostsSearchCache(req);
    await clearRedisPostsCache(req);

    return sendSuccess(res, result, "Post Media uploaded successfully", 201);
  } catch (error) {
    logger.error("Upload error:", error.message);
    return sendError(res, error.message, 500);
  }
});
//#endregion
