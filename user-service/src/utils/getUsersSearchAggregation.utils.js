import mongoose from "mongoose";

/**
 * Creates aggregation pipeline for user search
 * @param {string} query - The search query string
 * @param {string} excludeUserId - User ID to exclude from results (optional)
 * @returns {Array} MongoDB aggregation pipeline stages of users
 */
export const getUsersSearchAggregation = (query, excludeUserId) => {
  const regex = new RegExp(query, "i");

  const matchStage = {
    $or: [
      { username: regex },
      { fullName: regex },
      { location: regex },
      { bio: regex },
    ],
  };

  if (excludeUserId) {
    matchStage._id = {
      $ne: new mongoose.Types.ObjectId(excludeUserId),
    };
  }

  return [
    { $match: matchStage },
    {
      $lookup: {
        from: "usermedias",
        localField: "_id",
        foreignField: "user",
        as: "userMedias",
      },
    },
    {
      $addFields: {
        profile_photo: {
          $let: {
            vars: {
              profileMedia: {
                $sortArray: {
                  input: {
                    $filter: {
                      input: "$userMedias",
                      cond: { $eq: ["$$this.type", "profile"] },
                    },
                  },
                  sortBy: { createdAt: -1 },
                },
              },
            },
            in: {
              $arrayElemAt: [
                {
                  $map: {
                    input: "$$profileMedia",
                    as: "media",
                    in: {
                      _id: "$$media._id",
                      url: "$$media.url",
                      createdAt: "$$media.createdAt",
                    },
                  },
                },
                0,
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        password: 0,
        __v: 0,
        userMedias: 0,
      },
    },
    { $limit: 20 },
  ];
};
