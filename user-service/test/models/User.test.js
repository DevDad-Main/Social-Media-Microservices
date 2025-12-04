import { describe, it, expect, beforeEach } from 'vitest';
import { User } from '../../src/models/User.model.js';

describe('User Model', () => {
  describe('User Creation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const user = new User(userData);
      await user.save();

      expect(user.username).toBe(userData.username);
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });

    it('should hash password on save', async () => {
      const user = new User({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123',
      });

      await user.save();

      expect(user.password).not.toBe('password123');
      expect(user.password.length).toBeGreaterThan(10); // Hashed password is longer
    });

    it('should not hash password if not modified', async () => {
      const user = new User({
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'password123',
      });

      await user.save();
      const originalHash = user.password;

      user.username = 'updateduser';
      await user.save();

      expect(user.password).toBe(originalHash);
    });
  });

  describe('Password Comparison', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        username: 'testuser4',
        email: 'test4@example.com',
        password: 'password123',
      });
      await user.save();
    });

    it('should return true for correct password', async () => {
      const isMatch = await user.comparePassword('password123');
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const isMatch = await user.comparePassword('wrongpassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should require username', async () => {
      const user = new User({
        email: 'test@example.com',
        password: 'password123',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require email', async () => {
      const user = new User({
        username: 'testuser',
        password: 'password123',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should require password', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique username', async () => {
      await new User({
        username: 'uniqueuser',
        email: 'test1@example.com',
        password: 'password123',
      }).save();

      const duplicateUser = new User({
        username: 'uniqueuser',
        email: 'test2@example.com',
        password: 'password123',
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      await new User({
        username: 'user1',
        email: 'unique@example.com',
        password: 'password123',
      }).save();

      const duplicateUser = new User({
        username: 'user2',
        email: 'unique@example.com',
        password: 'password123',
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });
});