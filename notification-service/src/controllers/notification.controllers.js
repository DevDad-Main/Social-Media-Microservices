import { catchAsync, sendSuccess } from "devdad-express-utils";
import { Notification } from "../models/Notification.model.js";
import { fetchUserFromUserServiceById } from "../utils/fetcherUserById.utils.js";

//#region Get All Notifications For A User
export const getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user?._id;

  // const notifications = await Notification.find({ user: userId });

  // if (notifications.length === 0) {
  //   logger.warn("No Notifications Found");
  //   return sendSuccess(res, [], "No Notifications Found", 200);
  // }
  //
  // //TODO: internal user call to fetch the user
  // const fromUser = await fetchUserFromUserServiceById(
  //   notifications.from.toString(),
  // );

  const notifications = await Notification.aggregate([
    {
      $match: { user: userId },
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
        localField: "fromUser._id",
        foreignField: "user",
        as: "fromUserMedias",
      },
    },
    {
      $unwind: "$fromUser",
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
        fromUser: {
          username: 1,
          fullName: 1,
          profilePicture: 1,
        },
        createdAt: 1,
      },
    },
  ]);

  return sendSuccess(
    res,
    notifications,
    "Notifications retrieved successfully",
    200,
  );
});
//#endregion
