import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import { Post } from "../../src/models/Post.model.js";
import postRouter from "../../src/routes/post.routes.js";
import { authenticateUserMiddleware } from "../../src/middleware/auth.middleware.js";
import mongoose from "mongoose";

// Mock the auth middleware to set req.user
vi.mock("../../src/middleware/auth.middleware.js", () => ({
  authenticateUserMiddleware: vi.fn((req, res, next) => {
    req.user = { _id: new mongoose.Types.ObjectId() }; // Mock user
    next();
  }),
}));

describe("Post Controller Integration Tests", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json()); // Basic middleware
    // Mock Redis client
    app.use((req, res, next) => {
      req.redisClient = {
        get: vi.fn().mockResolvedValue(null), // No cache
        set: vi.fn().mockResolvedValue(null),
      };
      next();
    });
    app.use("/api/posts", authenticateUserMiddleware); // Add auth middleware
    app.use("/api/posts", postRouter); // Your routes
  });

  beforeEach(async () => {
    await Post.deleteMany({}); // Clear DB
  });

  describe("POST /api/posts/create-post", () => {
    it("should create a new post successfully", async () => {
      const postData = {
        content: "Test content",
        postType: "text_with_image",
      };

      const response = await request(app)
        .post("/api/posts/create-post")
        .send(postData)
        .expect(201);

      expect(response.body.message).toBe("Post created successfully");
      expect(response.body.data).toHaveProperty("_id");
      expect(response.body.data.content).toBe(postData.content);
      expect(response.body.data.postType).toBe(postData.postType);
      expect(response.body.data.imageUrls).toEqual([
        "image1",
        "image2",
        "image3",
      ]);

      // Verify in DB
      const post = await Post.findById(response.body.data._id);
      expect(post).toBeTruthy();
      expect(post.content).toBe(postData.content);
    });

    it("should return 400 for invalid data", async () => {
      const invalidData = {
        content: "Test content",
        // missing postType
      };

      const response = await request(app)
        .post("/api/posts/create-post")
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain("postType");
    });

    it("should return 400 for invalid postType", async () => {
      const invalidData = {
        content: "Test content",
        postType: "invalid_type",
      };

      const response = await request(app)
        .post("/api/posts/create-post")
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain("postType");
    });
  });

  describe("GET /api/posts/get-posts", () => {
    beforeEach(async () => {
      // Create some test posts
      await Post.create([
        {
          user: new mongoose.Types.ObjectId(),
          content: "Post 1",
          postType: "text",
        },
        {
          user: new mongoose.Types.ObjectId(),
          content: "Post 2",
          postType: "image",
        },
        {
          user: new mongoose.Types.ObjectId(),
          content: "Post 3",
          postType: "text_with_image",
        },
      ]);
    });

    it("should retrieve posts successfully", async () => {
      const response = await request(app)
        .get("/api/posts/get-posts")
        .expect(200);

      expect(response.body.message).toBe("Posts retrieved successfully");
      expect(response.body.data).toHaveProperty("posts");
      expect(response.body.data.posts).toHaveLength(3);
      expect(response.body.data).toHaveProperty("currentPage", 1);
      expect(response.body.data).toHaveProperty("totalPages");
      expect(response.body.data).toHaveProperty("limit", 10);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get("/api/posts/get-posts?page=1&limit=2")
        .expect(200);

      expect(response.body.data.posts).toHaveLength(2);
      expect(response.body.data.currentPage).toBe(1);
      expect(response.body.data.limit).toBe(2);
    });

    it("should return empty array if no posts", async () => {
      await Post.deleteMany({}); // Clear posts

      const response = await request(app)
        .get("/api/posts/get-posts")
        .expect(200);

      expect(response.body.data.posts).toHaveLength(0);
    });
  });
});
