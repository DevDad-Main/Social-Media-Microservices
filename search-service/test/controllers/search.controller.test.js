import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../setup.js";
import { PostSearch } from "../../src/models/SearchPost.model.js";
import { UserSearch } from "../../src/models/SearchUser.model.js";

describe("Search Controllers", () => {
  beforeEach(async () => {
    // Clear database before each test
    await PostSearch.deleteMany({});
    await UserSearch.deleteMany({});
  });

  afterEach(async () => {
    // Clear database after each test
    await PostSearch.deleteMany({});
    await UserSearch.deleteMany({});
  });

  describe("postSearch", () => {
    it("should return 400 if query parameter is missing", async () => {
      const response = await request(app)
        .get("/api/search/posts")
        .expect(400);

      expect(response.body.message).toBe("Missing query parameter");
    });

    it("should return empty array if no posts match search", async () => {
      const response = await request(app)
        .get("/api/search/posts?query=nonexistent")
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it("should return posts matching search query", async () => {
      // Create test post search data
      await PostSearch.create({
        postId: "post123",
        userId: "user123",
        searchTerm: "hello world this is a test post",
        postCreatedAt: "2023-01-01T00:00:00.000Z"
      });

      await PostSearch.create({
        postId: "post456",
        userId: "user456",
        searchTerm: "another post about technology",
        postCreatedAt: "2023-01-02T00:00:00.000Z"
      });

      const response = await request(app)
        .get("/api/search/posts?query=hello")
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].postId).toBe("post123");
      expect(response.body.data[0].searchTerm).toContain("hello");
    });

    it("should return multiple posts matching search query", async () => {
      // Create test post search data
      await PostSearch.create({
        postId: "post123",
        userId: "user123",
        searchTerm: "hello world this is a test post",
        postCreatedAt: "2023-01-01T00:00:00.000Z"
      });

      await PostSearch.create({
        postId: "post456",
        userId: "user456",
        searchTerm: "hello there this is another post",
        postCreatedAt: "2023-01-02T00:00:00.000Z"
      });

      await PostSearch.create({
        postId: "post789",
        userId: "user789",
        searchTerm: "goodbye world this is different",
        postCreatedAt: "2023-01-03T00:00:00.000Z"
      });

      const response = await request(app)
        .get("/api/search/posts?query=hello")
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map(post => post.postId)).toContain("post123");
      expect(response.body.data.map(post => post.postId)).toContain("post456");
      expect(response.body.data.map(post => post.postId)).not.toContain("post789");
    });

    it("should limit results to 10 posts", async () => {
      // Create 15 test posts
      for (let i = 0; i < 15; i++) {
        await PostSearch.create({
          postId: `post${i}`,
          userId: `user${i}`,
          searchTerm: `hello world post number ${i}`,
          postCreatedAt: `2023-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`
        });
      }

      const response = await request(app)
        .get("/api/search/posts?query=hello")
        .expect(200);

      expect(response.body.data).toHaveLength(10);
    });
  });

  describe("userSearch", () => {
    it("should return 400 if query parameter is missing", async () => {
      const response = await request(app)
        .get("/api/search/discover")
        .expect(400);

      expect(response.body.message).toBe("Missing query parameter");
    });

    it("should return empty array if no users match search", async () => {
      const response = await request(app)
        .get("/api/search/discover?query=nonexistent")
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it("should return users matching search query", async () => {
      // Create test user search data
      await UserSearch.create({
        userId: "user123",
        searchTerm: "john doe software developer",
        userCreatedAt: "2023-01-01T00:00:00.000Z"
      });

      await UserSearch.create({
        userId: "user456",
        searchTerm: "jane smith designer",
        userCreatedAt: "2023-01-02T00:00:00.000Z"
      });

      const response = await request(app)
        .get("/api/search/discover?query=john")
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].userId).toBe("user123");
      expect(response.body.data[0].searchTerm).toContain("john");
    });

    it("should return multiple users matching search query", async () => {
      // Create test user search data
      await UserSearch.create({
        userId: "user123",
        searchTerm: "john doe software developer",
        userCreatedAt: "2023-01-01T00:00:00.000Z"
      });

      await UserSearch.create({
        userId: "user456",
        searchTerm: "john smith designer",
        userCreatedAt: "2023-01-02T00:00:00.000Z"
      });

      await UserSearch.create({
        userId: "user789",
        searchTerm: "jane doe developer",
        userCreatedAt: "2023-01-03T00:00:00.000Z"
      });

      const response = await request(app)
        .get("/api/search/discover?query=john")
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.map(user => user.userId)).toContain("user123");
      expect(response.body.data.map(user => user.userId)).toContain("user456");
      expect(response.body.data.map(user => user.userId)).not.toContain("user789");
    });

    it("should limit results to 10 users", async () => {
      // Create 15 test users
      for (let i = 0; i < 15; i++) {
        await UserSearch.create({
          userId: `user${i}`,
          searchTerm: `user number ${i} with name john`,
          userCreatedAt: `2023-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`
        });
      }

      const response = await request(app)
        .get("/api/search/discover?query=john")
        .expect(200);

      expect(response.body.data).toHaveLength(10);
    });
  });
});