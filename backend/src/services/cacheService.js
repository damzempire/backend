const redis = require('redis');

class CacheService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  /**
   * Initialize Redis connection
   */
  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      this.client = redis.createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Generate cache key for user vaults
   * @param {string} address - User address
   * @returns {string} Cache key
   */
  getUserVaultsKey(address) {
    return `user_vaults_${address}`;
  }

  /**
   * Generate cache key for user portfolio
   * @param {string} address - User address
   * @returns {string} Cache key
   */
  getUserPortfolioKey(address) {
    return `user_portfolio:${address}`;
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    try {
      if (!this.isConnected || !this.client) {
        return null;
      }

      const value = await this.client.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (optional)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttl, serializedValue);
      return true;
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., "user_vaults_*")
   * @returns {Promise<boolean>} Success status
   */
  async deletePattern(pattern) {
    try {
      if (!this.isConnected || !this.client) {
        return false;
      }

      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
      return false;
    }
  }

  /**
   * Invalidate user vaults cache for a specific address
   * @param {string} address - User address
   * @returns {Promise<boolean>} Success status
   */
  async invalidateUserVaults(address) {
    const key = this.getUserVaultsKey(address);
    return await this.del(key);
  }

  /**
   * Invalidate user portfolio cache for a specific address
   * @param {string} address - User address
   * @returns {Promise<boolean>} Success status
   */
  async invalidateUserPortfolio(address) {
    const key = this.getUserPortfolioKey(address);
    return await this.del(key);
  }

  /**
   * Invalidate all user vaults cache
   * @returns {Promise<boolean>} Success status
   */
  async invalidateAllUserVaults() {
    return await this.deletePattern('user_vaults_*');
  }

  /**
   * Check if cache is connected
   * @returns {boolean} Connection status
   */
  isReady() {
    return this.isConnected && this.client !== null;
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        console.log('Redis client disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting from Redis:', error);
    }
  }
}

module.exports = new CacheService();
