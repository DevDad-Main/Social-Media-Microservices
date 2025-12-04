import { describe, it, expect, beforeAll } from 'vitest';
import { generateTokens } from '../../src/utils/generateToken.utils.js';
import { User } from '../../src/models/User.model.js';
import { RefreshToken } from '../../src/models/RefreshToken.model.js';

describe('generateTokens', () => {
  let user;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
  });

  beforeEach(async () => {
    user = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });
    await user.save();
  });

  it('should generate access and refresh tokens', async () => {
    const tokens = await generateTokens(user);

    expect(tokens).toHaveProperty('accesstoken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(typeof tokens.accesstoken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
  });

  it('should create a refresh token in database', async () => {
    const { refreshToken } = await generateTokens(user);

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    expect(storedToken).toBeTruthy();
    expect(storedToken.user.toString()).toBe(user._id.toString());
    expect(storedToken.expiresAt).toBeInstanceOf(Date);
  });

  it('should set refresh token expiration to 7 days from now', async () => {
    const before = new Date();
    const { refreshToken } = await generateTokens(user);
    const after = new Date();

    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    const expectedExpiry = new Date(before);
    expectedExpiry.setDate(expectedExpiry.getDate() + 7);

    expect(storedToken.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(storedToken.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  it('should throw error for invalid user id', async () => {
    const invalidUser = { _id: 'invalid-id' };

    await expect(generateTokens(invalidUser)).rejects.toThrow();
  });
});