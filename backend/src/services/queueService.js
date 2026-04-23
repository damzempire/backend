const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const Sentry = require('@sentry/node');

class QueueService {
  constructor(options = {}) {
    this.redisConfig = {
      host: options.redisHost || process.env.REDIS_HOST || 'localhost',
      port: options.redisPort || process.env.REDIS_PORT || 6379,
      password: options.redisPassword || process.env.REDIS_PASSWORD,
      db: options.redisDb || process.env.REDIS_DB || 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      // Connection timeout
      connectTimeout: 10000,
      // Command timeout
      commandTimeout: 5000,
    };

    this.connection = new IORedis(this.redisConfig);
    this.queues = new Map();
    this.workers = new Map();
    this.isReady = false;

    // Setup connection event handlers
    this.setupConnectionHandlers();
  }

  /**
   * Setup Redis connection event handlers
   */
  setupConnectionHandlers() {
    this.connection.on('connect', () => {
      console.log('Redis connected successfully');
      this.isReady = true;
    });

    this.connection.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.isReady = false;
      Sentry.captureException(error, {
        tags: { service: 'queue-service', component: 'redis' }
      });
    });

    this.connection.on('close', () => {
      console.log('Redis connection closed');
      this.isReady = false;
    });

    this.connection.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  async connect() {
    try {
      await this.connection.connect();
      console.log('QueueService: Redis connection established');
      return true;
    } catch (error) {
      console.error('QueueService: Failed to connect to Redis:', error);
      Sentry.captureException(error, {
        tags: { service: 'queue-service', component: 'redis-connection' }
      });
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    try {
      // Close all workers
      for (const [name, worker] of this.workers) {
        await worker.close();
        console.log(`Worker ${name} closed`);
      }
      this.workers.clear();

      // Close all queues
      for (const [name, queue] of this.queues) {
        await queue.close();
        console.log(`Queue ${name} closed`);
      }
      this.queues.clear();

      // Close Redis connection
      await this.connection.disconnect();
      console.log('QueueService: Redis connection closed');
      this.isReady = false;
    } catch (error) {
      console.error('QueueService: Error during disconnect:', error);
      throw error;
    }
  }

  /**
   * Get or create a queue
   * @param {string} name - Queue name
   * @param {Object} options - Queue options
   * @returns {Queue} BullMQ queue instance
   */
  getQueue(name, options = {}) {
    if (!this.queues.has(name)) {
      const defaultOptions = {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: 100, // Keep last 100 completed jobs
          removeOnFail: 50, // Keep last 50 failed jobs
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
        ...options
      };

      const queue = new Queue(name, defaultOptions);
      this.queues.set(name, queue);

      // Setup queue event handlers
      this.setupQueueHandlers(queue, name);
    }

    return this.queues.get(name);
  }

  /**
   * Setup queue event handlers
   * @param {Queue} queue - BullMQ queue
   * @param {string} name - Queue name
   */
  setupQueueHandlers(queue, name) {
    queue.on('error', (error) => {
      console.error(`Queue ${name} error:`, error);
      Sentry.captureException(error, {
        tags: { service: 'queue-service', queue: name }
      });
    });

    queue.on('waiting', (job) => {
      console.log(`Job ${job.id} in queue ${name} is waiting`);
    });

    queue.on('active', (job) => {
      console.log(`Job ${job.id} in queue ${name} is active`);
    });

    queue.on('completed', (job) => {
      console.log(`Job ${job.id} in queue ${name} completed`);
    });

    queue.on('failed', (job, error) => {
      console.error(`Job ${job.id} in queue ${name} failed:`, error);
      Sentry.captureException(error, {
        tags: { service: 'queue-service', queue: name },
        extra: { jobId: job.id, jobData: job.data }
      });
    });

    queue.on('stalled', (job) => {
      console.warn(`Job ${job.id} in queue ${name} is stalled`);
    });
  }

  /**
   * Get or create a worker
   * @param {string} queueName - Queue name
   * @param {Function} processor - Job processor function
   * @param {Object} options - Worker options
   * @returns {Worker} BullMQ worker instance
   */
  getWorker(queueName, processor, options = {}) {
    if (!this.workers.has(queueName)) {
      const defaultOptions = {
        connection: this.connection,
        concurrency: options.concurrency || 5,
        ...options
      };

      const worker = new Worker(queueName, processor, defaultOptions);
      this.workers.set(queueName, worker);

      // Setup worker event handlers
      this.setupWorkerHandlers(worker, queueName);
    }

    return this.workers.get(queueName);
  }

  /**
   * Setup worker event handlers
   * @param {Worker} worker - BullMQ worker
   * @param {string} queueName - Queue name
   */
  setupWorkerHandlers(worker, queueName) {
    worker.on('error', (error) => {
      console.error(`Worker for queue ${queueName} error:`, error);
      Sentry.captureException(error, {
        tags: { service: 'queue-service', worker: queueName }
      });
    });

    worker.on('completed', (job) => {
      console.log(`Worker completed job ${job.id} for queue ${queueName}`);
    });

    worker.on('failed', (job, error) => {
      console.error(`Worker failed job ${job.id} for queue ${queueName}:`, error);
    });

    worker.on('stalled', (job) => {
      console.warn(`Worker stalled job ${job.id} for queue ${queueName}`);
    });
  }

  /**
   * Add job to queue
   * @param {string} queueName - Queue name
   * @param {string} jobName - Job name
   * @param {Object} data - Job data
   * @param {Object} options - Job options
   * @returns {Promise<Job>} BullMQ job
   */
  async addJob(queueName, jobName, data, options = {}) {
    const queue = this.getQueue(queueName);
    
    try {
      const job = await queue.add(jobName, data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        backoff: options.backoff || {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: options.removeOnComplete || 100,
        removeOnFail: options.removeOnFail || 50,
        ...options
      });

      console.log(`Added job ${job.id} (${jobName}) to queue ${queueName}`);
      return job;
    } catch (error) {
      console.error(`Failed to add job to queue ${queueName}:`, error);
      Sentry.captureException(error, {
        tags: { service: 'queue-service', queue: queueName },
        extra: { jobName, data }
      });
      throw error;
    }
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Queue name
   * @returns {Promise<Object>} Queue statistics
   */
  async getQueueStats(queueName) {
    const queue = this.getQueue(queueName);
    
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        queueName,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        total: waiting.length + active.length + completed.length + failed.length + delayed.length
      };
    } catch (error) {
      console.error(`Failed to get stats for queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get all queue statistics
   * @returns {Promise<Array>} Array of queue statistics
   */
  async getAllQueueStats() {
    const stats = [];
    
    for (const queueName of this.queues.keys()) {
      try {
        const queueStats = await this.getQueueStats(queueName);
        stats.push(queueStats);
      } catch (error) {
        console.error(`Failed to get stats for queue ${queueName}:`, error);
        stats.push({
          queueName,
          error: error.message,
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          total: 0
        });
      }
    }

    return stats;
  }

  /**
   * Pause queue
   * @param {string} queueName - Queue name
   */
  async pauseQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.pause();
    console.log(`Queue ${queueName} paused`);
  }

  /**
   * Resume queue
   * @param {string} queueName - Queue name
   */
  async resumeQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.resume();
    console.log(`Queue ${queueName} resumed`);
  }

  /**
   * Clear queue
   * @param {string} queueName - Queue name
   */
  async clearQueue(queueName) {
    const queue = this.getQueue(queueName);
    await queue.drain();
    console.log(`Queue ${queueName} cleared`);
  }

  /**
   * Get failed jobs from queue
   * @param {string} queueName - Queue name
   * @param {number} limit - Maximum number of jobs to return
   * @returns {Promise<Array>} Array of failed jobs
   */
  async getFailedJobs(queueName, limit = 50) {
    const queue = this.getQueue(queueName);
    
    try {
      const failedJobs = await queue.getFailed(0, limit - 1);
      return failedJobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn
      }));
    } catch (error) {
      console.error(`Failed to get failed jobs from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed job
   * @param {string} queueName - Queue name
   * @param {string} jobId - Job ID
   * @returns {Promise<Job>} Retried job
   */
  async retryJob(queueName, jobId) {
    const queue = this.getQueue(queueName);
    
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found in queue ${queueName}`);
      }

      await job.retry();
      console.log(`Retried job ${jobId} in queue ${queueName}`);
      return job;
    } catch (error) {
      console.error(`Failed to retry job ${jobId} in queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Delete job from queue
   * @param {string} queueName - Queue name
   * @param {string} jobId - Job ID
   * @returns {Promise<boolean>} True if job was deleted
   */
  async deleteJob(queueName, jobId) {
    const queue = this.getQueue(queueName);
    
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        return false;
      }

      await job.remove();
      console.log(`Deleted job ${jobId} from queue ${queueName}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete job ${jobId} from queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Check if Redis is ready
   * @returns {boolean} Redis connection status
   */
  isRedisReady() {
    return this.isReady && this.connection.status === 'ready';
  }

  /**
   * Get Redis connection status
   * @returns {Object} Connection status information
   */
  getConnectionStatus() {
    return {
      status: this.connection.status,
      ready: this.isReady,
      host: this.redisConfig.host,
      port: this.redisConfig.port,
      db: this.redisConfig.db,
      queueCount: this.queues.size,
      workerCount: this.workers.size
    };
  }

  /**
   * Health check for queue service
   * @returns {Promise<Object>} Health check results
   */
  async healthCheck() {
    try {
      // Test Redis connection
      await this.connection.ping();
      
      // Get queue stats
      const queueStats = await this.getAllQueueStats();
      
      return {
        status: 'healthy',
        redis: {
          connected: this.isRedisReady(),
          status: this.connection.status
        },
        queues: queueStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        redis: {
          connected: this.isRedisReady(),
          status: this.connection.status
        },
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = QueueService;
