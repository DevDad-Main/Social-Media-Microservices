import { catchAsync, sendSuccess } from "devdad-express-utils";
import { Notification } from "../models/Notification.model.js";
import mongoose from "mongoose";

//#region Get All Notifications For A User
export const getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;

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
  ]);

  console.log("DEBUG: notifications", notifications);

  return sendSuccess(
    res,
    { notificationCount: notifications.length, notifications },
    "Notifications retrieved successfully",
    200,
  );
});
//#endregion
