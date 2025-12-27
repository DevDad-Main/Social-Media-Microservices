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
      from: "usermedias",
      localField: "_id",
      foreignField: "user",
      as: "userMedias",
    },
  },
  {
    $lookup: {
      from: "posts",
      let: { userId: "$_id" },
      pipeline: [
        {
          $match: {
            $expr: { $in: ["$$userId", "$likesCount"] },
          },
        },
      ],
      as: "likedPosts",
    },
  },
  {
    $lookup: {
      from: "postmedias",
      localField: "likedPosts._id",
      foreignField: "postId",
      as: "likedPostMedias",
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
                    in: { $ifNull: ["$$postMedia.urls", []] },
                  },
                },
              },
            ],
          },
        },
      },
      likedPosts: {
        $map: {
          input: "$likedPosts",
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
                          input: "$likedPostMedias",
                          cond: { $eq: ["$$this.postId", "$$post._id"] },
                        },
                      },
                    },
                    in: { $ifNull: ["$$postMedia.urls", []] },
                  },
                },
              },
            ],
          },
        },
      },
      profilePhoto: {
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
      coverPhoto: {
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
      profilePhoto: 1,
      coverPhoto: 1,

      // Posts with media
      posts: {
        _id: 1,
        content: 1,
        postType: 1,
        likesCount: 1,
        image_urls: 1,
        createdAt: 1,
        updatedAt: 1,
      },

      // Liked posts with media
      likedPosts: {
        _id: 1,
        content: 1,
        postType: 1,
        likesCount: 1,
        image_urls: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  },
];

