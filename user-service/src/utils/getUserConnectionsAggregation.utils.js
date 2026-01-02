import mongoose from "mongoose";

/**
 * Creates an aggregation pipeline to fetch user connections with profile photos
 * @param {string} userId - The user ID to fetch connections for
 * @returns {Array} MongoDB aggregation pipeline
 */
export const getUserConnectionsAggregation = (userId) => {
  return [
    // Match the specific user
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    // Populate user details for connections
    {
      $lookup: {
        from: "users",
        localField: "connections",
        foreignField: "_id",
        as: "connections",
      },
    },
    // Populate user details for followers
    {
      $lookup: {
        from: "users",
        localField: "followers",
        foreignField: "_id",
        as: "followers",
      },
    },
    // Populate user details for following
    {
      $lookup: {
        from: "users",
        localField: "following",
        foreignField: "_id",
        as: "following",
      },
    },
    // Get pending connections
    {
      $lookup: {
        from: "connections",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$to_user_id", "$$userId"] },
                  { $eq: ["$status", "pending"] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "from_user_id",
              foreignField: "_id",
              as: "fromUser",
            },
          },
          {
            $unwind: "$fromUser",
          },
        ],
        as: "pendingConnections",
      },
    },
    // Collect all user IDs for media lookup
    {
      $addFields: {
        allUserIds: {
          $concatArrays: [
            { $map: { input: "$connections", as: "conn", in: "$$conn._id" } },
            {
              $map: {
                input: "$followers",
                as: "follower",
                in: "$$follower._id",
              },
            },
            {
              $map: {
                input: "$following",
                as: "following",
                in: "$$following._id",
              },
            },
            {
              $map: {
                input: "$pendingConnections",
                as: "pending",
                in: "$$pending.fromUser._id",
              },
            },
          ],
        },
      },
    },
    // Lookup profile photos for all connected users
    {
      $lookup: {
        from: "usermedias",
        let: { userIds: "$allUserIds" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$user", "$$userIds"] },
                  { $eq: ["$type", "profile"] },
                ],
              },
            },
          },
          {
            $sort: { createdAt: -1 },
          },
          {
            $group: {
              _id: "$user",
              profile_photo: { $first: "$url" },
            },
          },
        ],
        as: "profilePhotos",
      },
    },
    // Transform connections with profile photos
    {
      $addFields: {
        connections: {
          $map: {
            input: "$connections",
            as: "connection",
            in: {
              $mergeObjects: [
                "$$connection",
                {
                  profile_photo: {
                    $let: {
                      vars: {
                        profilePhoto: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$profilePhotos",
                                cond: {
                                  $eq: ["$$this._id", "$$connection._id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$profilePhoto.profile_photo",
                    },
                  },
                },
              ],
            },
          },
        },
        followers: {
          $map: {
            input: "$followers",
            as: "follower",
            in: {
              $mergeObjects: [
                "$$follower",
                {
                  profile_photo: {
                    $let: {
                      vars: {
                        profilePhoto: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$profilePhotos",
                                cond: { $eq: ["$$this._id", "$$follower._id"] },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$profilePhoto.profile_photo",
                    },
                  },
                },
              ],
            },
          },
        },
        following: {
          $map: {
            input: "$following",
            as: "following",
            in: {
              $mergeObjects: [
                "$$following",
                {
                  profile_photo: {
                    $let: {
                      vars: {
                        profilePhoto: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$profilePhotos",
                                cond: {
                                  $eq: ["$$this._id", "$$following._id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$profilePhoto.profile_photo",
                    },
                  },
                },
              ],
            },
          },
        },
        // Transform pending connections with profile photos
        pendingConnections: {
          $map: {
            input: "$pendingConnections",
            as: "pending",
            in: {
              $mergeObjects: [
                "$$pending.fromUser",
                {
                  profile_photo: {
                    $let: {
                      vars: {
                        profilePhoto: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$profilePhotos",
                                cond: {
                                  $eq: ["$$this._id", "$$pending.fromUser._id"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: "$$profilePhoto.profile_photo",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
    // Final projection to clean up the data and exclude sensitive fields
    {
      $project: {
        connections: {
          $map: {
            input: "$connections",
            as: "connection",
            in: {
              _id: "$$connection._id",
              fullName: "$$connection.fullName",
              username: "$$connection.username",
              email: "$$connection.email",
              bio: "$$connection.bio",
              location: "$$connection.location",
              createdAt: "$$connection.createdAt",
              updatedAt: "$$connection.updatedAt",
              profile_photo: "$$connection.profile_photo",
            },
          },
        },
        followers: {
          $map: {
            input: "$followers",
            as: "follower",
            in: {
              _id: "$$follower._id",
              fullName: "$$follower.fullName",
              username: "$$follower.username",
              email: "$$follower.email",
              bio: "$$follower.bio",
              location: "$$follower.location",
              createdAt: "$$follower.createdAt",
              updatedAt: "$$follower.updatedAt",
              profile_photo: "$$follower.profile_photo",
            },
          },
        },
        following: {
          $map: {
            input: "$following",
            as: "following",
            in: {
              _id: "$$following._id",
              fullName: "$$following.fullName",
              username: "$$following.username",
              email: "$$following.email",
              bio: "$$following.bio",
              location: "$$following.location",
              createdAt: "$$following.createdAt",
              updatedAt: "$$following.updatedAt",
              profile_photo: "$$following.profile_photo",
            },
          },
        },
        pendingConnections: {
          $map: {
            input: "$pendingConnections",
            as: "pending",
            in: {
              _id: "$$pending._id",
              fullName: "$$pending.fullName",
              username: "$$pending.username",
              email: "$$pending.email",
              bio: "$$pending.bio",
              location: "$$pending.location",
              createdAt: "$$pending.createdAt",
              updatedAt: "$$pending.updatedAt",
              profile_photo: "$$pending.profile_photo",
            },
          },
        },
      },
    },
  ];
};
