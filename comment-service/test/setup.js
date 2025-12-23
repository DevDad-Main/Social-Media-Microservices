import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { vi } from 'vitest';

let mongoServer;

// Mock RabbitMQ
vi.mock('../src/utils/rabbitmq.utils.js', () => ({
  publishEvent: vi.fn(),
}));

// Mock cache clearing
vi.mock('../src/utils/cleanRedisCache.utils.js', () => ({
  clearRedisPostCache: vi.fn().mockResolvedValue(),
  clearRedisPostsCache: vi.fn().mockResolvedValue(),
}));

// Mock post service
vi.mock('../src/utils/fetchPostById.utils.js', () => ({
  fetchPostFromPostServiceById: vi.fn().mockResolvedValue({
    data: {
      postId: '507f1f77bcf86cd799439011',
      user: '507f1f77bcf86cd799439012'
    }
  }),
}));

// Mock user service
vi.mock('../src/utils/fetcherUserById.utils.js', () => ({
  fetchUserFromUserServiceById: vi.fn().mockResolvedValue({
    _id: '507f1f77bcf86cd799439013',
    username: 'testuser',
    email: 'test@example.com'
  }),
}));

// Mock authentication middleware
vi.mock('../src/middleware/auth.middleware.js', () => ({
  authenticateUserMiddleware: vi.fn((req, res, next) => {
    req.user = {
      _id: '507f1f77bcf86cd799439013',
      username: 'testuser',
      email: 'test@example.com'
    };
    next();
  }),
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});