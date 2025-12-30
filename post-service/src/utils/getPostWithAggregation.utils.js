import mongoose from "mongoose";
import { Post } from "../models/Post.model.js";

export const getPostWithAggregation = async (postId) => {
  const [post] = await Post.aggregate([
    // Stage 1: Match the specific post by ID
    { $match: { _id: new mongoose.Types.ObjectId(postId) } },

    // Stage 2: Get post media files
    {
      $lookup: {
        from: "postmedias",
        localField: "_id",
        foreignField: "postId",
        as: "media",
      },
    },

    // Stage 3: Get comments for this post
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "post",
        as: "comments",
      },
    },

    // Stage 4: Get all replies for the comments
    {
      $lookup: {
        from: "comments",
        let: { commentIds: "$comments._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: ["$parent", "$$commentIds"]
              }
            }
          }
        ],
        as: "replies",
      },
    },

    // Stage 5: Get user profiles for all comment and reply authors
    {
      $lookup: {
        from: "users",
        let: { comments: "$comments", replies: "$replies" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  { $in: ["$_id", "$$comments.owner"] },
                  { $in: ["$_id", "$$replies.owner"] }
                ]
              }
            }
          }
        ],
        as: "commentUsers",
      },
    },

    // Stage 6: Get media files for comment users (profile pictures, cover photos)
    {
      $lookup: {
        from: "usermedias",
        localField: "commentUsers._id",
        foreignField: "user",
        as: "userMedias",
      },
    },

    // Stage 7: Get the post author's profile
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "postAuthor",
      },
    },

    // Stage 8: Get media files for post author
    {
      $lookup: {
        from: "usermedias",
        localField: "user",
        foreignField: "user",
        as: "authorMedias",
      },
    },

    // Stage 9: Convert postAuthor from array to object (since we expect only one)
    {
      $unwind: {
        path: "$postAuthor",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Stage 10: Add profile pictures and cover photos to users and build nested structure
    {
      $addFields: {
        // Add profile picture to post author
        "postAuthor.profile_photo": {
          $let: {
            vars: {
              profileMedia: {
                $filter: {
                  input: "$authorMedias",
                  cond: { $eq: ["$$this.type", "profile"] },
                },
              },
            },
            in: { $arrayElemAt: ["$$profileMedia.url", 0] },
          },
        },

        // Add cover photo to post author
        "postAuthor.coverPhoto": {
          $let: {
            vars: {
              coverMedia: {
                $filter: {
                  input: "$authorMedias",
                  cond: { $eq: ["$$this.type", "cover"] },
                },
              },
            },
            in: { $arrayElemAt: ["$$coverMedia.url", 0] },
          },
        },

        // Transform comments array to include user profiles with media and replies
        comments: {
          $map: {
            input: "$comments",
            as: "comment",
            in: {
              $mergeObjects: [
                "$$comment", // Keep original comment fields
                {
                  owner: {
                    $let: {
                      vars: {
                        // Find the user profile for this comment's owner
                        user: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$commentUsers",
                                cond: {
                                  $eq: ["$$this._id", "$$comment.owner"],
                                },
                              },
                            },
                            0,
                          ],
                        },
                        // Find media files for this comment's user
                        userMedias: {
                          $filter: {
                            input: "$userMedias",
                            cond: { $eq: ["$$this.user", "$$comment.owner"] },
                          },
                        },
                      },
                      in: {
                        $mergeObjects: [
                          "$$user", // User profile data
                          {
                            // Add profile picture from user media
                            profile_photo: {
                              $let: {
                                vars: {
                                  profileMedia: {
                                    $filter: {
                                      input: "$$userMedias",
                                      cond: { $eq: ["$$this.type", "profile"] },
                                    },
                                  },
                                },
                                in: { $arrayElemAt: ["$$profileMedia.url", 0] },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                {
                  // Add replies to each comment with user data, sorted by newest first
                  replies: {
                    $let: {
                      vars: {
                        // First filter replies for this comment
                        commentReplies: {
                          $filter: {
                            input: "$replies",
                            cond: { $eq: ["$$this.parent", "$$comment._id"] },
                          },
                        },
                      },
                      in: {
                        $map: {
                          input: {
                            // Sort replies by createdAt descending (newest first)
                            $sortArray: {
                              input: "$$commentReplies",
                              sortBy: { createdAt: -1 },
                            },
                          },
                          as: "reply",
                          in: {
                            $mergeObjects: [
                              "$$reply", // Keep original reply fields
                              {
                                owner: {
                                  $let: {
                                    vars: {
                                      // Find the user profile for this reply's owner
                                      user: {
                                        $arrayElemAt: [
                                          {
                                            $filter: {
                                              input: "$commentUsers",
                                              cond: {
                                                $eq: ["$$this._id", "$$reply.owner"],
                                              },
                                            },
                                          },
                                          0,
                                        ],
                                      },
                                      // Find media files for this reply's user
                                      userMedias: {
                                        $filter: {
                                          input: "$userMedias",
                                          cond: { $eq: ["$$this.user", "$$reply.owner"] },
                                        },
                                      },
                                    },
                                    in: {
                                      $mergeObjects: [
                                        "$$user", // User profile data
                                        {
                                          // Add profile picture from user media
                                          profile_photo: {
                                            $let: {
                                              vars: {
                                                profileMedia: {
                                                  $filter: {
                                                    input: "$$userMedias",
                                                    cond: { $eq: ["$$this.type", "profile"] },
                                                  },
                                                },
                                              },
                                              in: { $arrayElemAt: ["$$profileMedia.url", 0] },
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
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },

    // Stage 11: Final projection - shape the output
    {
      $project: {
        _id: 1,
        content: 1,
        postType: 1,
        likesCount: 1,
        createdAt: 1,
        updatedAt: 1,

        // Flatten media URLs into a simple array
        image_urls: {
          $reduce: {
            input: "$media",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this.urls"] },
          },
        },

        // Include only necessary comment fields
        comments: {
          _id: 1,
          content: 1,
          createdAt: 1,
          parent: 1,
          owner: {
            _id: 1,
            username: 1,
            profile_photo: 1,
          },
          replies: {
            _id: 1,
            content: 1,
            createdAt: 1,
            parent: 1,
            owner: {
              _id: 1,
              username: 1,
              fullName: 1,
              profile_photo: 1,
            },
          },
        },
        postAuthor: 1,
      },
    },
  ]);

  return post;
};
