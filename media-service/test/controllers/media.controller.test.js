import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../setup.js";
import { Media } from "../../src/models/Media.model.js";
import { PostMedia } from "../../src/models/PostMedia.model.js";

describe("Media Controllers", () => {
  beforeEach(async () => {
    // Clear database before each test
    await Media.deleteMany({});
    await PostMedia.deleteMany({});
  });

  afterEach(async () => {
    // Clear database after each test
    await Media.deleteMany({});
    await PostMedia.deleteMany({});
  });

  describe("fetchUserMedia", () => {
    it("should return 404 if userId is not provided", async () => {
      const response = await request(app)
        .get("/api/media/fetch-user-media/")
        .expect(404);

      // Express returns 404 with empty body when route doesn't match
      expect(response.body).toEqual({});
    });

    it("should return 400 if userId is not a valid ObjectId", async () => {
      const response = await request(app)
        .get("/api/media/fetch-user-media/invalid-id")
        .expect(400);

      expect(response.body.message).toContain("not a valid MongoDB ObjectId");
    });

    it("should return 400 if no media found for user", async () => {
      const validUserId = "507f1f77bcf86cd799439011";
      const response = await request(app)
        .get(`/api/media/fetch-user-media/${validUserId}`)
        .expect(400);

      expect(response.body.message).toBe("No Media Found");
    });

    it("should return user media successfully", async () => {
      const validUserId = "507f1f77bcf86cd799439011";
      
      // Create test media
      await Media.create({
        user: validUserId,
        url: "https://example.com/image.jpg",
        type: "profile",
        publicId: "test_public_id",
        originalFilename: "image.jpg",
        mimeType: "image/jpeg"
      });

      const response = await request(app)
        .get(`/api/media/fetch-user-media/${validUserId}`)
        .expect(200);

      expect(response.body.message).toBe("Media Fetched Successfully");
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].url).toBe("https://example.com/image.jpg");
    });
  });

  describe("fetchPostMedia", () => {
    it("should return 404 if postId is not provided", async () => {
      const response = await request(app)
        .get("/api/media/fetch-post-media/")
        .expect(404);

      // Express returns 404 with empty body when route doesn't match
      expect(response.body).toEqual({});
    });

    it("should return 400 if postId is not a valid ObjectId", async () => {
      const response = await request(app)
        .get("/api/media/fetch-post-media/invalid-id")
        .expect(400);

      expect(response.body.message).toContain("not a valid MongoDB ObjectId");
    });

    it("should return 404 if no post media found", async () => {
      const validPostId = "507f1f77bcf86cd799439011";
      const response = await request(app)
        .get(`/api/media/fetch-post-media/${validPostId}`)
        .expect(404);

      expect(response.body.message).toBe("No Post Media Found");
    });

    it("should return post media URLs successfully", async () => {
      const validPostId = "507f1f77bcf86cd799439011";
      
      // Create test post media
      await PostMedia.create({
        postId: validPostId,
        urls: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
        publicId: ["test_public_id_1", "test_public_id_2"],
        originalFilenames: ["image1.jpg", "image2.jpg"],
        mimeType: "image/jpeg",
        user: "507f1f77bcf86cd799439012"
      });

      const response = await request(app)
        .get(`/api/media/fetch-post-media/${validPostId}`)
        .expect(200);

      expect(response.body.message).toBe("Media Fetched Successfully");
      expect(response.body.data.urls).toHaveLength(2);
      expect(response.body.data.urls).toContain("https://example.com/image1.jpg");
      expect(response.body.data.urls).toContain("https://example.com/image2.jpg");
    });

    it("should return empty array if post media has no URLs", async () => {
      const validPostId = "507f1f77bcf86cd799439011";
      
      // Create test post media with empty URLs
      await PostMedia.create({
        postId: validPostId,
        urls: [],
        publicId: [],
        originalFilenames: [],
        mimeType: "image/jpeg",
        user: "507f1f77bcf86cd799439012"
      });

      const response = await request(app)
        .get(`/api/media/fetch-post-media/${validPostId}`)
        .expect(200);

      expect(response.body.message).toBe("Media Fetched Successfully");
      expect(response.body.data.urls).toEqual([]);
    });
  });
});