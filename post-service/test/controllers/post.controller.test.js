import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  vi,
  afterAll,
} from "vitest";
import request from "supertest";
import express from "express";
import { Post } from "../../src/models/Post.model.js";
import postRouter from "../../src/routes/post.routes.js";
import { authenticateUserMiddleware } from "../../src/middleware/auth.middleware.js";
import mongoose from "mongoose";

// Mock auth middleware to set req.user
const mockUserId = new mongoose.Types.ObjectId();
vi.mock("../../src/middleware/auth.middleware.js", () => ({
  authenticateUserMiddleware: vi.fn((req, res, next) => {
    req.user = { _id: mockUserId }; // Mock user
    next();
  }),
}));

// Mock external services
vi.mock("../../src/utils/postServiceAxiosRequests.utils.js", () => ({
  postMediaFilesToMediaServiceForProcessing: vi.fn().mockResolvedValue({
    data: { media: { urls: ["image1", "image2", "image3"] } }
  }),
  getPostMediaFilesFromMediaService: vi.fn().mockResolvedValue({
    urls: ["media1.jpg", "media2.jpg"]
  }),
}));

// Mock RabbitMQ
vi.mock("../../src/utils/rabbitmq.utils.js", () => ({
  publishEvent: vi.fn(),
}));

// Mock cache clearing
vi.mock("../../src/utils/cleanRedisCache.utils.js", () => ({
  clearRedisPostCache: vi.fn().mockResolvedValue(),
  clearRedisPostsCache: vi.fn().mockResolvedValue(),
  clearRedisPostsSearchCache: vi.fn().mockResolvedValue(),
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
      expect(response.body.data).toHaveProperty("newelyCreatedPost");
      expect(response.body.data).toHaveProperty("postMediaURLs");
      expect(response.body.data.newelyCreatedPost.content).toBe(postData.content);
      expect(response.body.data.newelyCreatedPost.postType).toBe(postData.postType);
      expect(response.body.data.postMediaURLs).toEqual([]); // No files uploaded in test

      // Verify in DB
      const post = await Post.findById(response.body.data.newelyCreatedPost._id);
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

      expect(response.body.message).toContain("Post type must be one of");
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

      expect(response.body.message).toContain("Post type must be one of");
    });
  });

  describe("GET /api/posts/get-posts", () => {
    beforeEach(async () => {
      // Create some test posts
      await Post.create([
        {
          user: mockUserId,
          content: "Post 1",
          postType: "text",
        },
        {
          user: mockUserId,
          content: "Post 2",
          postType: "image",
        },
        {
          user: mockUserId,
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

  describe("GET /api/posts/get-post/:id", () => {
    let createdPost;

    beforeEach(async () => {
      // Create test post with same user ID as mock auth
      createdPost = await Post.create({
        user: mockUserId,
        content: "Post 1",
        postType: "text",
      });
    });

    it("should retrieve post by id successfully", async () => {
      const response = await request(app)
        .get(`/api/posts/get-post/${createdPost._id}`)
        .expect(200);

      expect(response.body.message).toBe("Post retrieved successfully");
      expect(response.body.data._id).toBe(String(createdPost._id));
      expect(response.body.data).toHaveProperty("media");
    });

    it("should return an error if post id is not valid", async () => {
      const response = await request(app)
        .get("/api/posts/get-post/63455354")
        .expect(400);

      expect(response.body.message).toBe("Invalid Post ID");
    });

    it("should return an error if no post found", async () => {
      const id = new mongoose.Types.ObjectId();

      const response = await request(app)
        .get(`/api/posts/get-post/${id}`)
        .expect(404);

      expect(response.body.message).toBe("Post not found");
    });
  });

  describe("DELETE /api/posts/delete-post/:id", () => {
    let createdPost;

    beforeEach(async () => {
      // Create test post with same user ID as mock auth
      createdPost = await Post.create({
        user: mockUserId,
        content: "Post 1",
        postType: "text",
      });
    });

    it("should delete post by id successfully", async () => {
      const response = await request(app)
        .delete(`/api/posts/delete-post/${createdPost._id}`)
        .expect(200);

      expect(response.body.message).toBe("Post deleted successfully");
      expect(response.body.data).toEqual({});

      // Verify post is deleted from DB
      const deletedPost = await Post.findById(createdPost._id);
      expect(deletedPost).toBeNull();
    });

    it("should return an error if post id is not valid", async () => {
      const response = await request(app)
        .delete("/api/posts/delete-post/63455354")
        .expect(400);

      expect(response.body.message).toBe("Invalid Post ID");
    });

    it("should return an error if no post found", async () => {
      const id = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/posts/delete-post/${id}`)
        .expect(404);

      expect(response.body.message).toBe("Post Not Found");
    });
  });
});
