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
  clearRedisUserCache: vi.fn().mockResolvedValue(),
}));

// Mock media service
vi.mock('../src/utils/fetchUrlsFromMediaService.utils.js', () => ({
  fetchMediaByUserId: vi.fn().mockResolvedValue({
    profilePhoto: { url: 'http://example.com/profile.jpg' },
    coverPhoto: { url: 'http://example.com/cover.jpg' }
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