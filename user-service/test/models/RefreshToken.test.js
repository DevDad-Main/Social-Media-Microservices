import { describe, it, expect } from 'vitest';
import { RefreshToken } from '../../src/models/RefreshToken.model.js';
import { User } from '../../src/models/User.model.js';

describe('RefreshToken Model', () => {
  let user;

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });
    await user.save();
  });

  describe('RefreshToken Creation', () => {
    it('should create a refresh token with valid data', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const refreshToken = new RefreshToken({
        token: 'some-random-token-string',
        user: user._id,
        expiresAt,
      });

      await refreshToken.save();

      expect(refreshToken.token).toBe('some-random-token-string');
      expect(refreshToken.user.toString()).toBe(user._id.toString());
      expect(refreshToken.expiresAt).toEqual(expiresAt);
    });

    it('should require token', async () => {
      const refreshToken = new RefreshToken({
        user: user._id,
        expiresAt: new Date(),
      });

      await expect(refreshToken.save()).rejects.toThrow();
    });

    it('should require user', async () => {
      const refreshToken = new RefreshToken({
        token: 'token',
        expiresAt: new Date(),
      });

      await expect(refreshToken.save()).rejects.toThrow();
    });

    it('should require expiresAt', async () => {
      const refreshToken = new RefreshToken({
        token: 'token',
        user: user._id,
      });

      await expect(refreshToken.save()).rejects.toThrow();
    });

    it('should enforce unique token', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await new RefreshToken({
        token: 'unique-token',
        user: user._id,
        expiresAt,
      }).save();

      const duplicateToken = new RefreshToken({
        token: 'unique-token',
        user: user._id,
        expiresAt,
      });

      await expect(duplicateToken.save()).rejects.toThrow();
    });
  });
});