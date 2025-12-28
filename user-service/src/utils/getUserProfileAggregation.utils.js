import mongoose from "mongoose";

/**
 * Creates an aggregation pipeline to fetch user profile with all related data
 * @param {string} userId - The ID of the user to fetch
 * @returns {Array} MongoDB aggregation pipeline
 */
export const getUserProfileAggregation = (userId) => [
  { $match: { _id: new mongoose.Types.ObjectId(userId) } },

  {
    $lookup: {
      from: "posts",
      localField: "_id",
      foreignField: "user",
      as: "posts",
    },
  },
  {
    $lookup: {
      from: "postmedias",
      localField: "posts._id",
      foreignField: "postId",
      as: "postMedias",
    },
  },
  {
    $lookup: {
      from: "users",
      localField: "posts.user",
      foreignField: "_id",
      as: "postUsers",
    },
  },
  {
    $lookup: {
      from: "usermedias",
      localField: "postUsers._id",
      foreignField: "user",
      as: "postUserMedias",
    },
  },
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
      // Transform posts to include media URLs
      posts: {
        $map: {
          input: "$posts",
          as: "post",
          in: {
            $mergeObjects: [
              "$$post",
              {
                image_urls: {
                  $let: {
                    vars: {
                      postMedia: {
                        $filter: {
                          input: "$postMedias",
                          cond: { $eq: ["$$this.postId", "$$post._id"] },
                        },
                      },
                    },
                    in: {
                      $let: {
                        vars: {
                          mediaUrls: { $arrayElemAt: ["$$postMedia.urls", 0] },
                        },
                        in: { $ifNull: ["$$mediaUrls", []] },
                      },
                    },
                  },
                },
                user: {
                  $let: {
                    vars: {
                      postUser: {
                        $filter: {
                          input: "$postUsers",
                          cond: { $eq: ["$$this._id", "$$post.user"] },
                        },
                      },
                    },
                    in: {
                      $mergeObjects: [
                        { $arrayElemAt: ["$$postUser", 0] },
                        {
                          profile_photo: {
                            $let: {
                              vars: {
                                postUserMedia: {
                                  $filter: {
                                    input: "$postUserMedias",
                                    cond: {
                                      $and: [
                                        { $eq: ["$$this.user", "$$post.user"] },
                                        { $eq: ["$$this.type", "profile"] },
                                      ],
                                    },
                                  },
                                },
                              },
                              in: { $arrayElemAt: ["$$postUserMedia.url", 0] },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },

      profile_photo: {
        $let: {
          vars: {
            profileMedia: {
              $filter: {
                input: "$userMedias",
                cond: { $eq: ["$$this.type", "profile"] },
              },
            },
          },
          in: { $arrayElemAt: ["$$profileMedia.url", 0] },
        },
      },
      cover_photo: {
        $let: {
          vars: {
            coverMedia: {
              $filter: {
                input: "$userMedias",
                cond: { $eq: ["$$this.type", "cover"] },
              },
            },
          },
          in: { $arrayElemAt: ["$$coverMedia.url", 0] },
        },
      },
    },
  },
  {
    $project: {
      // User profile fields
      _id: 1,
      fullName: 1,
      username: 1,
      bio: 1,
      location: 1,
      email: 1,
      followers: 1,
      following: 1,
      connections: 1,
      createdAt: 1,
      updatedAt: 1,

      // Media fields
      profile_photo: 1,
      cover_photo: 1,

      // Posts with media and user, sorted by newest first
      posts: {
        $sortArray: {
          input: {
            $map: {
              input: "$posts",
              as: "post",
              in: {
                _id: "$$post._id",
                content: "$$post.content",
                postType: "$$post.postType",
                likesCount: "$$post.likesCount",
                image_urls: "$$post.image_urls",
                user: "$$post.user",
                createdAt: "$$post.createdAt",
                updatedAt: "$$post.updatedAt",
              },
            },
          },
          sortBy: { createdAt: -1 },
        },
      },
    },
  },
];
