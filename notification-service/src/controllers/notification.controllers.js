import {
  catchAsync,
  sendSuccess,
  sendError,
  logger,
} from "devdad-express-utils";
import { Notification } from "../models/Notification.model.js";
import mongoose, { isValidObjectId } from "mongoose";

//#region Get All Notifications For A User
export const getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;

  if (!isValidObjectId(userId)) {
    logger.warn(`Invalid User ID: ${userId}`);
    return sendError(res, "Invalid User ID", 400);
  }

  const notifications = await Notification.aggregate([
    {
      $match: { user: new mongoose.Types.ObjectId(userId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "from",
        foreignField: "_id",
        as: "fromUser",
      },
    },
    {
      $lookup: {
        from: "usermedias",
        localField: "from",
        foreignField: "user",
        as: "fromUserMedias",
      },
    },
    {
      $unwind: { path: "$fromUser", preserveNullAndEmptyArrays: true },
    },
    {
      $addFields: {
        "fromUser.profilePicture": {
          $let: {
            vars: {
              profileMedia: {
                $filter: {
                  input: "$fromUserMedias",
                  cond: { $eq: ["$$this.type", "profile"] },
                },
              },
            },
            in: { $arrayElemAt: ["$$profileMedia.url", 0] },
          },
        },
      },
    },
    {
      $project: {
        type: 1,
        entityId: 1,
        read: 1,
        fromUser: {
          username: 1,
          fullName: 1,
          profilePicture: 1,
        },
        createdAt: 1,
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $limit: 10,
    },
  ]);

  logger.info("DEBUG: notifications", { notifications });

  return sendSuccess(
    res,
    { notificationCount: notifications.length, notifications },
    "Notifications retrieved successfully",
    200,
  );
});
//#endregion

//#region Mark Notification As Read
export const markNotificationAsRead = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;

  if (!isValidObjectId(notificationId)) {
    logger.warn(`Invalid Notification ID: ${notificationId}`);
    return sendError(res, "Invalid Notification ID", 400);
  }

  const notificationToUpdate = await Notification.findByIdAndUpdate(
    notificationId,
    { read: true },
  );

  if (!notificationToUpdate) {
    logger.warn(
      `Notification Not Found || Notification Failed To Update: ${notificationId}`,
    );
    return sendError(
      res,
      `Notification Not Found || Notification Failed To Update: ${notificationId}`,
      404,
    );
  }

  return sendSuccess(res, {}, "Notification marked as read successfully", 200);
});
//#endregion

//#region Delete Notification
export const deleteNotification = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;

  if (!isValidObjectId(notificationId)) {
    logger.warn(`Invalid Notification ID: ${notificationId}`);
    return sendError(res, "Invalid Notification ID", 400);
  }

  const notificationToDelete =
    await Notification.findByIdAndDelete(notificationId);

  if (!notificationToDelete) {
    logger.warn(
      `Notification Not Found: ${notificationId} || Notification Failed To Delete`,
    );
    return sendError(
      res,
      `Notification Not Found: ${notificationId} || Notification Failed To Delete`,
      404,
    );
  }

  return sendSuccess(res, {}, "Notification deleted successfully", 200);
});
//#endregion

//#region Clear All Notifications
export const clearAllNotifications = catchAsync(async (req, res, next) => {
  const loggedInUserId = req.user?._id;

  if (!isValidObjectId(loggedInUserId)) {
    logger.warn(`Invalid User ID: ${loggedInUserId}`);
    return sendError(res, "Invalid User ID", 400);
  }

  await Notification.deleteMany({ user: loggedInUserId });

  return sendSuccess(res, {}, "All notifications cleared successfully", 200);
});
//#endregion
