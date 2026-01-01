import mongoose from "mongoose";

export const getStoriesAggregationPipeline = (userIds, currentUserId) => [
  {
    $match: {
      user: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
      createdAt: {
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  },
  // Preserve original user ID before lookups
  {
    $addFields: {
      originalUserId: "$user",
    },
  },

  // Story media
  {
    $lookup: {
      from: "storymedias",
      localField: "_id",
      foreignField: "storyId",
      as: "media",
    },
  },

  // User
  {
    $lookup: {
      from: "users",
      localField: "user",
      foreignField: "_id",
      as: "user",
    },
  },
  { $unwind: "$user" },

  // Preserve original user ID before population
  {
    $addFields: {
      originalUserId: "$user._id",
    },
  },

  // User profile media
  {
    $lookup: {
      from: "usermedias",
      localField: "user._id",
      foreignField: "user",
      as: "usermedias",
    },
  },

  // Derived fields
  {
    $addFields: {
      profile_photo: {
        $let: {
          vars: {
            profileMedia: {
              $filter: {
                input: "$usermedias",
                cond: { $eq: ["$$this.type", "profile"] },
              },
            },
          },
          in: {
            $getField: {
              field: "url",
              input: { $arrayElemAt: ["$$profileMedia", 0] },
            },
          },
        },
      },
      media_url: {
        $getField: {
          field: "url",
          input: { $arrayElemAt: ["$media", 0] },
        },
      },
      isOwner: {
        $eq: ["$originalUserId", new mongoose.Types.ObjectId(currentUserId)],
      },
    },
  },

  // Final shape
  {
    $project: {
      _id: 1,
      content: 1,
      mediaType: 1,
      backgroundColour: 1,
      createdAt: 1,
      updatedAt: 1,
      media_url: 1,
      profile_photo: 1,
      isOwner: 1,
      user: {
        _id: "$user._id",
        username: "$user.username",
        fullName: "$user.fullName",
      },
    },
  },

  { $sort: { createdAt: -1 } },
];
