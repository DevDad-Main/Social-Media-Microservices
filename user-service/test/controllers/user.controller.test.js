import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import userRouter from '../../src/routes/user.routes.js';
import { User } from '../../src/models/User.model.js';
import { RefreshToken } from '../../src/models/RefreshToken.model.js';

describe('User Controller Integration Tests', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';

    // Create test app without rate limiting
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use('/api/auth', userRouter);
  });

  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    await RefreshToken.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User Registered Successfully');
      expect(response.body.data).toHaveProperty('accesstoken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Check user was created
      const user = await User.findOne({ email: userData.email });
      expect(user).toBeTruthy();
      expect(user.username).toBe(userData.username);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        username: 'ab', // too short
        email: 'invalid-email',
        password: '123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain('username');
    });

    it('should return 400 for duplicate user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toBe('User Already Exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a user for login tests
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      await user.save();
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login Successful');
      expect(response.body.data).toHaveProperty('accesstoken');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data).toHaveProperty('userId');
    });

    it('should return 404 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(404);

      expect(response.body.message).toBe('User Not Found');
    });

    it('should return 400 for incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.message).toBe('Invalid Password');
    });

    it('should return 400 for invalid login data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '12',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toContain('email');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let refreshToken;

    beforeEach(async () => {
      // Create user and refresh token
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      await user.save();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const tokenDoc = new RefreshToken({
        token: 'test-refresh-token',
        user: user._id,
        expiresAt,
      });
      await tokenDoc.save();
      refreshToken = tokenDoc.token;
    });

    it('should generate new tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(201);

      expect(response.body.message).toBe('Refresh Token Generated Successfully');
      expect(response.body.data).toHaveProperty('accesstoken');
      expect(response.body.data).toHaveProperty('refreshToken');

      // Old token should be deleted
      const oldToken = await RefreshToken.findOne({ token: refreshToken });
      expect(oldToken).toBeNull();
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Refresh Token Not Found');
    });

    it('should return 404 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(404);

      expect(response.body.message).toBe('Refresh Token Not Found');
    });

    it('should return 401 for expired refresh token', async () => {
      // Create expired token
      const user = await User.findOne({ email: 'test@example.com' });
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      const expiredToken = new RefreshToken({
        token: 'expired-token',
        user: user._id,
        expiresAt: expiredDate,
      });
      await expiredToken.save();

      const response = await request(app)
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'expired-token' })
        .expect(401);

      expect(response.body.message).toBe('Refresh Token Expired');
    });
  });

  describe('POST /api/auth/logout', () => {
    let refreshToken;

    beforeEach(async () => {
      // Create user and refresh token
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
      await user.save();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const tokenDoc = new RefreshToken({
        token: 'test-refresh-token',
        user: user._id,
        expiresAt,
      });
      await tokenDoc.save();
      refreshToken = tokenDoc.token;
    });

    it('should logout successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Logout Successful');

      // Token should be deleted
      const token = await RefreshToken.findOne({ token: refreshToken });
      expect(token).toBeNull();
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Refresh Token Not Found');
    });

    it('should return 404 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken: 'invalid-token' })
        .expect(404);

      expect(response.body.message).toBe('Refresh Token Failed To Delete');
    });
  });
});