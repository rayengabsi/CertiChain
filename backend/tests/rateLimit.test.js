/**
 * SEC-12 — rate limiting must actually trigger.
 * A dedicated file so the limit can be lowered BEFORE the app module is imported
 * (each Jest test file gets a fresh module registry).
 */
process.env.RATE_LIMIT_AUTH = '3';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { connectDb, mongoose } = require('../src/config/db');
const User = require('../src/models/User');

describe('SEC-12 rate limiting', () => {
  beforeAll(async () => {
    await connectDb();
    await User.deleteMany({});
    await User.create({ email: 'rl@test.local', passwordHash: await bcrypt.hash('Rate-Limit-123', 4), role: 'admin' });
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  it('SEC-12: login attempts beyond the configured limit return 429', async () => {
    const codes = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await request(app).post('/api/auth/login').send({ email: 'rl@test.local', password: 'Rate-Limit-123' });
      codes.push(res.status);
    }
    expect(codes.slice(0, 3)).toEqual([200, 200, 200]);
    expect(codes[3]).toBe(429);
  });
});
