const { Worker } = require('bullmq');
const ioredis = require('ioredis');
    console.error(`Error in worker for job ${job.id}:`, error);
    throw error;
  }
}, { connection });

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);
});

module.exports = worker;
