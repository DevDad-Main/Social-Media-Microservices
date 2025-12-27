import mongoose from "mongoose";
import { Post } from "../models/Post.model.js";

export const getPostsWithAggregation = async (matchStage, limit) => {
  try {
    const posts = await Post.aggregate([
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
          "user.profile_photo": {
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
          //TODO: Not sure if we need the cover photo field, but we'll see, remove if redundant
          "user.cover_photo": {
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
          image_urls: {
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
          content: 1, // Fixed: was "caption"
          postType: 1,
          likesCount: 1,
          image_urls: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: 1,
            username: 1,
            profile_photo: 1,
            cover_photo: 1,
            fullName: 1,
          },
        },
      },
    ]);

    //  Remove potential duplicates (shouldn't be needed but for safety)
    const uniquePosts = posts.filter(
      (post, index, self) =>
        index ===
        self.findIndex((p) => p._id.toString() === post._id.toString()),
    );

    console.log("DEBUG: uniquePosts length = ", uniquePosts.length);
    return uniquePosts;
  } catch (error) {
    throw new Error(`Failed to fetch posts with aggregation: ${error.message}`);
  }
};
