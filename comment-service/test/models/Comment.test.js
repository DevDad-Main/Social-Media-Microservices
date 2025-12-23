import { describe, it, expect, beforeEach } from 'vitest';
import { Comment } from '../../src/models/Comment.model.js';
import mongoose from 'mongoose';

describe('Comment Model', () => {
  beforeEach(async () => {
    await Comment.deleteMany({});
  });

  describe('Validation', () => {
    it('should create a comment with required fields', async () => {
      const commentData = {
        content: 'This is a test comment',
        post: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
      };

      const comment = await Comment.create(commentData);
      
      expect(comment.content).toBe(commentData.content);
      expect(comment.post.toString()).toBe(commentData.post.toString());
      expect(comment.owner.toString()).toBe(commentData.owner.toString());
      expect(comment.parent).toBeNull();
      expect(comment.replies).toEqual([]);
      expect(comment.likes).toEqual([]);
      expect(comment.dislikes).toEqual([]);
      expect(comment.isOwner).toBe(false);
    });

    it('should fail validation without required fields', async () => {
      const invalidComment = {
        content: 'This is a test comment',
        // missing post
      };

      await expect(Comment.create(invalidComment)).rejects.toThrow();
    });

    it('should fail validation without content', async () => {
      const invalidComment = {
        post: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
      };

      await expect(Comment.create(invalidComment)).rejects.toThrow();
    });

    it('should create a reply comment with parent', async () => {
      const parentComment = await Comment.create({
        content: 'Parent comment',
        post: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
      });

      const replyData = {
        content: 'This is a reply',
        post: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
        parent: parentComment._id,
      };

      const reply = await Comment.create(replyData);
      
      expect(reply.content).toBe(replyData.content);
      expect(reply.parent.toString()).toBe(parentComment._id.toString());
    });

    it('should handle likes and dislikes arrays', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();
      
      const comment = await Comment.create({
        content: 'Test comment',
        post: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
        likes: [userId1],
        dislikes: [userId2],
      });

      expect(comment.likes).toHaveLength(1);
      expect(comment.dislikes).toHaveLength(1);
      expect(comment.likes[0].toString()).toBe(userId1.toString());
      expect(comment.dislikes[0].toString()).toBe(userId2.toString());
    });
  });

  describe('Timestamps', () => {
    it('should have createdAt and updatedAt fields', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        post: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
      });

      expect(comment.createdAt).toBeDefined();
      expect(comment.updatedAt).toBeDefined();
      expect(comment.createdAt).toBeInstanceOf(Date);
      expect(comment.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Default Values', () => {
    it('should set default values correctly', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        post: new mongoose.Types.ObjectId(),
        owner: new mongoose.Types.ObjectId(),
      });

      expect(comment.isOwner).toBe(false);
      expect(comment.parent).toBeNull();
      expect(comment.replies).toEqual([]);
      expect(comment.likes).toEqual([]);
      expect(comment.dislikes).toEqual([]);
    });
  });
});