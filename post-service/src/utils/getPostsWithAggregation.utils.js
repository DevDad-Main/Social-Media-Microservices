import mongoose from "mongoose";
import { Post } from "../models/Post.model.js";

export const getPostsWithAggregation = async (matchStage, limit) => {
  const [posts] = await Post.aggregate([
    { $match: matchStage },

    { $sort: { createdAt: -1 } },

    { $limit: limit + 1 }, // one extra to know if more exist

    {
      $lookup: {
        from: "postmedias",
        localField: "_id",
        foreignField: "postId",
        as: "media",
      },
    },
    {
      $lookup: {
        from: "usermedias",
        localField: "user",
        foreignField: "user",
        as: "usermedias",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

    {
      $addFields: {
        "user.profilePicture": {
          $let: {
            vars: {
              profileMedia: {
                $filter: {
                  input: "$usermedias",
                  cond: { $eq: ["$$this.type", "profile"] },
                },
              },
            },
            in: { $arrayElemAt: ["$$profileMedia.url", 0] },
          },
        },
        "user.coverPhoto": {
          $let: {
            vars: {
              coverMedia: {
                $filter: {
                  input: "$usermedias",
                  cond: { $eq: ["$$this.type", "cover"] },
                },
              },
            },
            in: { $arrayElemAt: ["$$coverMedia.url", 0] },
          },
        },
        mediaUrls: {
          $reduce: {
            input: "$media",
            initialValue: [],
            in: { $concatArrays: ["$$value", "$$this.urls"] },
          },
        },
      },
    },

    {
      $project: {
        _id: 1,
        caption: 1,
        mediaUrls: 1,
        createdAt: 1,
        user: {
          _id: 1,
          username: 1,
          profilePicture: 1,
          coverPhoto: 1,
        },
      },
    },
  ]);
  return posts;
};
