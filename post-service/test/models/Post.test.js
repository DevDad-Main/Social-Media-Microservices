import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import { Post } from "../../src/models/Post.model.js";

describe("Post Model", () => {
  describe("Post Creation", () => {
    it("should create a post with valid data", async () => {
      const userId = new mongoose.Types.ObjectId();

      const userData = {
        user: userId,
        content: "test content goes here",
        imageUrls: ["image1", "image2", "image3"],
        postType: "text_with_image",
      };

      const post = await Post.create(userData);

      expect(post.content).toBe(userData.content);
      expect(post.imageUrls).toStrictEqual(userData.imageUrls);
      expect(post.postType).toBe(userData.postType);
    });
  });

  describe("Validation", () => {
    it("should require user", async () => {
      const post = new Post({
        content: "test content goes here",
        imageUrls: ["image1", "image2", "image3"],
        postType: "text_with_image",
      });

      await expect(post.save()).rejects.toThrow();
    });

    it("should require postType", async () => {
      const post = new Post({
        user: new mongoose.Types.ObjectId(),
        content: "test content goes here",
        imageUrls: ["image1", "image2", "image3"],
      });

      await expect(post.save()).rejects.toThrow();
    });
  });
});
