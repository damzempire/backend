const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const ioredis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const client = new ioredis(REDIS_URL);

// Global rate limiter (100 requests/min)
const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => client.call(...args),
  }),
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
});

// Stricter rate limiter for auth endpoints (5 requests/min)
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => client.call(...args),
  }),
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again after a minute.',
  },
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
};
