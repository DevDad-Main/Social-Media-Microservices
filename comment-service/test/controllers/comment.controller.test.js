import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import commentRoutes from '../../src/routes/comment.routes.js';
import { Comment } from '../../src/models/Comment.model.js';
import mongoose from 'mongoose';

// Mock the dependencies
vi.mock('../../src/utils/fetchPostById.utils.js');
vi.mock('../../src/utils/fetcherUserById.utils.js');
vi.mock('../../src/utils/cleanRedisCache.utils.js');
vi.mock('../../src/utils/rabbitmq.utils.js');
vi.mock('../../src/middleware/auth.middleware.js');

describe('Comment Controller', () => {
  let app;
  let testUser;
  let testPost;
  let testComment;

  beforeEach(async () => {
    await Comment.deleteMany({});
    
    // Create test user and post data
    testUser = {
      _id: new mongoose.Types.ObjectId(),
      username: 'testuser',
      email: 'test@example.com'
    };

    testPost = {
      postId: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId()
    };

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/comments', commentRoutes);
  });

  describe('POST /comments/add-comment/:postId', () => {
    it('should create a new comment successfully', async () => {
      const { fetchPostFromPostServiceById } = await import('../../src/utils/fetchPostById.utils.js');
      const { fetchUserFromUserServiceById } = await import('../../src/utils/fetcherUserById.utils.js');
      
      fetchPostFromPostServiceById.mockResolvedValue({ data: testPost });
      fetchUserFromUserServiceById.mockResolvedValue(testUser);

      const response = await request(app)
        .post(`/comments/add-comment/${testPost.postId}`)
        .send({ content: 'This is a test comment' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This is a test comment');
      expect(response.body.data.user).toEqual(testUser);
    });

    it('should return validation error for empty content', async () => {
      const response = await request(app)
        .post(`/comments/add-comment/${testPost.postId}`)
        .send({ content: '' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error for invalid post ID', async () => {
      const response = await request(app)
        .post('/comments/add-comment/invalid-id')
        .send({ content: 'This is a test comment' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error when post not found', async () => {
      const { fetchPostFromPostServiceById } = await import('../../src/utils/fetchPostById.utils.js');
      fetchPostFromPostServiceById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/comments/add-comment/${testPost.postId}`)
        .send({ content: 'This is a test comment' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /comments/add-reply/:postId', () => {
    beforeEach(async () => {
      testComment = await Comment.create({
        content: 'Parent comment',
        post: testPost.postId,
        owner: testUser._id,
      });
    });

    it('should create a reply comment successfully', async () => {
      const { fetchPostFromPostServiceById } = await import('../../src/utils/fetchPostById.utils.js');
      const { fetchUserFromUserServiceById } = await import('../../src/utils/fetcherUserById.utils.js');
      
      fetchPostFromPostServiceById.mockResolvedValue({ data: testPost });
      fetchUserFromUserServiceById.mockResolvedValue(testUser);

      const response = await request(app)
        .post(`/comments/add-reply/${testPost.postId}`)
        .send({ 
          content: 'This is a reply',
          parentId: testComment._id.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('This is a reply');
      expect(response.body.data.parent).toBe(testComment._id.toString());
    });

    it('should return error for invalid parent ID', async () => {
      const { fetchPostFromPostServiceById } = await import('../../src/utils/fetchPostById.utils.js');
      fetchPostFromPostServiceById.mockResolvedValue({ data: testPost });

      const response = await request(app)
        .post(`/comments/add-reply/${testPost.postId}`)
        .send({ 
          content: 'This is a reply',
          parentId: 'invalid-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /comments/fetch-comments-by-post/:postId', () => {
    beforeEach(async () => {
      await Comment.create({
        content: 'Test comment 1',
        post: testPost.postId,
        owner: testUser._id,
      });
      
      await Comment.create({
        content: 'Test comment 2',
        post: testPost.postId,
        owner: testUser._id,
      });
    });

    it('should fetch comments by post ID successfully', async () => {
      const response = await request(app)
        .get(`/comments/fetch-comments-by-post/${testPost.postId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should return error for invalid post ID', async () => {
      const response = await request(app)
        .get('/comments/fetch-comments-by-post/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 when no comments found', async () => {
      const emptyPostId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/comments/fetch-comments-by-post/${emptyPostId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /comments/update-comment/:commentId', () => {
    beforeEach(async () => {
      testComment = await Comment.create({
        content: 'Original comment',
        post: testPost.postId,
        owner: testUser._id,
      });
    });

    it('should update comment successfully', async () => {
      const response = await request(app)
        .put(`/comments/update-comment/${testComment._id}`)
        .send({ 
          commentId: testComment._id.toString(),
          content: 'Updated comment'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Updated comment');
    });

    it('should return validation error for empty content', async () => {
      const response = await request(app)
        .put(`/comments/update-comment/${testComment._id}`)
        .send({ 
          commentId: testComment._id.toString(),
          content: ''
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /comments/toggle-like/:commentId', () => {
    beforeEach(async () => {
      testComment = await Comment.create({
        content: 'Test comment',
        post: testPost.postId,
        owner: testUser._id,
      });
    });

    it('should add like to comment successfully', async () => {
      const response = await request(app)
        .post(`/comments/toggle-like/${testComment._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isLiked).toBe(true);
      expect(response.body.data.likes).toBe(1);
    });

    it('should remove like from comment successfully', async () => {
      // First add a like
      await Comment.findByIdAndUpdate(testComment._id, {
        $push: { likes: testUser._id }
      });

      const response = await request(app)
        .post(`/comments/toggle-like/${testComment._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isLiked).toBe(false);
      expect(response.body.data.likes).toBe(0);
    });

    it('should return error for non-existent comment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/comments/toggle-like/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /comments/toggle-dislike/:commentId', () => {
    beforeEach(async () => {
      testComment = await Comment.create({
        content: 'Test comment',
        post: testPost.postId,
        owner: testUser._id,
      });
    });

    it('should add dislike to comment successfully', async () => {
      const response = await request(app)
        .post(`/comments/toggle-dislike/${testComment._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isDisliked).toBe(true);
      expect(response.body.data.dislikes).toBe(1);
    });

    it('should remove dislike from comment successfully', async () => {
      // First add a dislike
      await Comment.findByIdAndUpdate(testComment._id, {
        $push: { dislikes: testUser._id }
      });

      const response = await request(app)
        .post(`/comments/toggle-dislike/${testComment._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isDisliked).toBe(false);
      expect(response.body.data.dislikes).toBe(0);
    });
  });

  describe('DELETE /comments/delete-comment/:commentId', () => {
    beforeEach(async () => {
      testComment = await Comment.create({
        content: 'Test comment',
        post: testPost.postId,
        owner: testUser._id,
      });
    });

    it('should delete comment successfully', async () => {
      const response = await request(app)
        .delete(`/comments/delete-comment/${testComment._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify comment is deleted
      const deletedComment = await Comment.findById(testComment._id);
      expect(deletedComment).toBeNull();
    });

    it('should return error for invalid comment ID', async () => {
      const response = await request(app)
        .delete('/comments/delete-comment/invalid-id');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return error for non-existent comment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/comments/delete-comment/${fakeId}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});