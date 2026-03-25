const { createClient } = require("./redis-client");

// Redis client for rate limiting
let redisClient = null;

// Initialize Redis client
const initializeRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url:
        process.env.REDIS_URL ||
        `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD,
      retry_delay_on_failover: 100,
      enable_offline_queue: false,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis Client Connected");
    });

    await redisClient.connect();
  }
  return redisClient;
};

// Get Redis client
const getRedisClient = () => {
  return redisClient;
};

// Wallet-based rate limiting using Redis
class WalletRateLimiter {
  constructor(windowMs = 60 * 1000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.redis = null;
  }

  async getRedis() {
    if (!this.redis) {
      this.redis = await initializeRedisClient();
    }
    return this.redis;
  }

  // Check if wallet address is valid (basic validation)
  isValidWalletAddress(address) {
    if (!address || typeof address !== "string") {
      return false;
    }

    // Basic validation - wallet addresses should be alphanumeric and reasonable length
    // This can be enhanced based on specific wallet format requirements
    const addressRegex = /^[a-zA-Z0-9]{20,50}$/;
    return addressRegex.test(address);
  }

  // Get rate limit key for wallet
  getRateLimitKey(walletAddress) {
    return `rate_limit:wallet:${walletAddress}`;
  }

  // Check rate limit for a wallet
  async checkRateLimit(walletAddress) {
    if (!this.isValidWalletAddress(walletAddress)) {
      throw new Error("Invalid wallet address format");
    }

    const redis = await this.getRedis();
    const key = this.getRateLimitKey(walletAddress);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Remove old entries outside the current window
      await redis.zRemRangeByScore(key, 0, windowStart);

      // Get current count
      const currentCount = await redis.zCard(key);

      // Check if limit exceeded
      if (currentCount >= this.maxRequests) {
        // Get oldest request time for reset time calculation
        const oldestRequest = await redis.zRange(key, 0, 0);
        const resetTime =
          oldestRequest.length > 0
            ? parseInt(oldestRequest[0]) + this.windowMs
            : now + this.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          total: this.maxRequests,
        };
      }

      // Add current request
      await redis.zAdd(key, { score: now, value: `${now}-${Math.random()}` });

      // Set expiration for the key
      await redis.expire(key, Math.ceil(this.windowMs / 1000) + 1);

      return {
        allowed: true,
        remaining: this.maxRequests - currentCount - 1,
        resetTime: now + this.windowMs,
        total: this.maxRequests,
      };
    } catch (error) {
      console.error("Rate limit check failed:", error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
        total: this.maxRequests,
      };
    }
  }

  // Reset rate limit for a wallet (for admin purposes)
  async resetRateLimit(walletAddress) {
    if (!this.isValidWalletAddress(walletAddress)) {
      throw new Error("Invalid wallet address format");
    }

    const redis = await this.getRedis();
    const key = this.getRateLimitKey(walletAddress);
    await redis.del(key);
  }

  // Get current rate limit status without incrementing
  async getRateLimitStatus(walletAddress) {
    if (!this.isValidWalletAddress(walletAddress)) {
      throw new Error("Invalid wallet address format");
    }

    const redis = await this.getRedis();
    const key = this.getRateLimitKey(walletAddress);
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Remove old entries outside the current window
      await redis.zRemRangeByScore(key, 0, windowStart);

      // Get current count
      const currentCount = await redis.zCard(key);

      // Get oldest request time for reset time calculation
      const oldestRequest = await redis.zRange(key, 0, 0);
      const resetTime =
        oldestRequest.length > 0
          ? parseInt(oldestRequest[0]) + this.windowMs
          : now + this.windowMs;

      return {
        current: currentCount,
        remaining: Math.max(0, this.maxRequests - currentCount),
        resetTime,
        total: this.maxRequests,
      };
    } catch (error) {
      console.error("Rate limit status check failed:", error);
      // Return default status if Redis is down
      return {
        current: 0,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs,
        total: this.maxRequests,
      };
    }
  }
}

// Default wallet rate limiter instance
const walletRateLimiter = new WalletRateLimiter(60 * 1000, 100); // 100 requests per minute

module.exports = {
  initializeRedisClient,
  getRedisClient,
  WalletRateLimiter,
  walletRateLimiter,
};
