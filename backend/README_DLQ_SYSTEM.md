# Dead Letter Queue (DLQ) System for RPC Failures

A robust BullMQ/Redis-based Dead Letter Queue system for handling failed RPC fetches in the Soroban Event Poller infrastructure. This prevents the entire indexer from halting due to network timeouts and provides reliable retry mechanisms.

## Overview

The DLQ system provides reliable RPC call processing with automatic retry logic, failure isolation, and comprehensive monitoring. When RPC calls fail after the configured number of retries, they are moved to a Dead Letter Queue for manual inspection and retry.

## Architecture

```
Dead Letter Queue System
    |
    |-- QueueService (BullMQ/Redis)
    |   |-- Redis connection management
    |   |-- Queue lifecycle management
    |   |-- Worker configuration
    |   `-- Health monitoring
    |
    |-- RpcQueueService
    |   |-- RPC fetch queue (main processing)
    |   |-- Priority RPC queue (high priority jobs)
    |   |-- Dead Letter Queue (failed jobs)
    |   |-- Retry logic and backoff
    |   `-- Alerting and monitoring
    |
    |-- Integration Layer
    |   |-- Soroban Event Poller integration
    |   |-- Automatic job submission
    |   `-- Status monitoring
    |
    `-- Management API
        |-- DLQ job management
        |-- Queue statistics
        |-- Manual operations
        `-- Health checks
```

## Components

### 1. QueueService

**Purpose**: Core BullMQ/Redis queue management service.

**Features**:
- Redis connection management with automatic reconnection
- Queue and worker lifecycle management
- Health monitoring and statistics
- Event handling and error tracking
- Configurable job options and retry policies

### 2. RpcQueueService

**Purpose**: High-level RPC queue management with DLQ functionality.

**Features**:
- Multiple queue types (main, priority, dead letter)
- Automatic retry with exponential backoff
- Failed job isolation in DLQ
- Alerting for critical failures
- Comprehensive statistics and monitoring

### 3. Queue Types

#### Main RPC Fetch Queue (`rpc-fetch`)
- **Purpose**: Standard RPC calls for event fetching
- **Concurrency**: 5 workers
- **Rate Limit**: 100 jobs/minute
- **Retries**: 3 attempts with exponential backoff

#### Priority RPC Queue (`priority-rpc-fetch`)
- **Purpose**: High-priority RPC calls
- **Concurrency**: 2 workers
- **Rate Limit**: 20 jobs/minute
- **Retries**: 4 attempts with faster backoff

#### Dead Letter Queue (`rpc-dead-letter`)
- **Purpose**: Failed RPC jobs after all retries exhausted
- **Concurrency**: 1 worker
- **Retries**: 1 (no retries in DLQ)
- **Purpose**: Monitoring and manual retry

## Configuration

### Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# RPC Queue Configuration
RPC_MAX_RETRIES=3
RPC_RETRY_DELAY=2000
DLQ_MAX_SIZE=1000
PRIORITY_THRESHOLD=10

# Queue Limits
RPC_QUEUE_CONCURRENCY=5
PRIORITY_QUEUE_CONCURRENCY=2
RPC_QUEUE_RATE_LIMIT=100
PRIORITY_QUEUE_RATE_LIMIT=20
```

### Service Configuration

```javascript
const rpcQueueService = new RpcQueueService({
  maxRetries: 3,              // Maximum retry attempts
  retryDelay: 2000,            // Base retry delay in ms
  dlqMaxSize: 1000,           // Maximum DLQ size
  priorityThreshold: 10,      // Priority job threshold
  
  // Redis configuration
  redisHost: 'localhost',
  redisPort: 6379,
  redisPassword: 'password',
  redisDb: 0
});
```

## Job Processing Flow

### 1. Job Submission
```javascript
// Add RPC job to queue
const job = await rpcQueueService.addRpcJob('getEvents', {
  startLedger: 1000,
  endLedger: 1100,
  contractIds: ['contract1', 'contract2']
}, {
  priority: 'high',          // or 'normal'
  source: 'event-poller',
  timeout: 30000
});
```

### 2. Job Processing
1. **Worker picks up job** from appropriate queue
2. **RPC client executes** the method with timeout
3. **Success**: Job marked complete, statistics updated
4. **Failure**: Retry with exponential backoff
5. **Final failure**: Move to Dead Letter Queue

### 3. Dead Letter Queue Processing
1. **DLQ worker processes** failed job
2. **Logs failure details** to monitoring systems
3. **Sends alert** to Slack for critical failures
4. **Updates statistics** for monitoring

## Retry Logic

### Exponential Backoff
```javascript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,    // Base delay: 2s
  }
}

// Retry delays:
// Attempt 1: 2s
// Attempt 2: 4s  
// Attempt 3: 8s
```

### Priority Queue Faster Retry
```javascript
{
  attempts: 4,              // Extra retry for priority jobs
  backoff: {
    type: 'exponential',
    delay: 1000,            // Faster base delay: 1s
  }
}

// Retry delays:
// Attempt 1: 1s
// Attempt 2: 2s
// Attempt 3: 4s
// Attempt 4: 8s
```

## API Endpoints

### Status and Monitoring

```bash
# Get overall queue status
GET /api/rpc-queue/status

# Health check
GET /api/rpc-queue/health

# Get queue configuration
GET /api/rpc-queue/config

# Reset statistics
POST /api/rpc-queue/stats/reset
```

### Dead Letter Queue Management

```bash
# Get DLQ jobs
GET /api/rpc-queue/dlq/jobs?limit=50

# Retry DLQ job
POST /api/rpc-queue/dlq/:jobId/retry

# Delete DLQ job
DELETE /api/rpc-queue/dlq/:jobId

# Clear DLQ
POST /api/rpc-queue/dlq/clear
```

### Queue Management

```bash
# Pause queues
POST /api/rpc-queue/queues/pause

# Resume queues
POST /api/rpc-queue/queues/resume

# Get queue-specific stats
GET /api/rpc-queue/queues/:queueName/stats

# Get failed jobs from queue
GET /api/rpc-queue/queues/:queueName/failed
```

### Manual Job Submission

```bash
# Add RPC job manually
POST /api/rpc-queue/jobs
{
  "method": "getEvents",
  "params": {
    "startLedger": 1000,
    "endLedger": 1100
  },
  "options": {
    "priority": "high",
    "timeout": 30000
  }
}
```

## Monitoring and Alerting

### Statistics Tracking

```javascript
const stats = await rpcQueueService.getStats();

// Returns:
{
  service: {
    isStarted: true,
    redisStatus: { connected: true, status: 'ready' }
  },
  queues: {
    rpcFetch: { waiting: 5, active: 2, completed: 1000, failed: 3, delayed: 1, total: 1011 },
    priorityRpc: { waiting: 1, active: 1, completed: 500, failed: 1, delayed: 0, total: 503 },
    deadLetter: { waiting: 2, active: 0, completed: 0, failed: 2, delayed: 0, total: 4 }
  },
  jobs: {
    totalJobs: 1514,
    successfulJobs: 1500,
    failedJobs: 6,
    dlqJobs: 2,
    retriedJobs: 8,
    successRate: 99.07,
    failureRate: 0.40,
    dlqRate: 0.13
  }
}
```

### Alert Types

#### Critical Alerts
- **DLQ Job Creation**: When jobs move to Dead Letter Queue
- **Queue Health Issues**: Redis connection failures
- **High Failure Rates**: When failure rate exceeds thresholds

#### Warning Alerts
- **Queue Backlog**: When waiting jobs exceed limits
- **Retry Exhaustion**: When jobs exhaust retry attempts
- **Performance Issues**: Slow job processing

### Slack Integration

DLQ events automatically trigger Slack alerts:

```
**RPC Job Failed - Moved to Dead Letter Queue**

**Original Job ID:** job-12345
**Method:** getEvents
**RPC URL:** https://horizon-testnet.stellar.org/soroban/rpc
**Attempts:** 3/3
**Duration:** 5000ms
**Error:** Network timeout

**Job Data:**
```json
{
  "startLedger": 1000,
  "endLedger": 1100,
  "contractIds": ["contract1"]
}
```

**Action Required:** Investigate RPC endpoint and retry manually if needed
```

## Integration with Soroban Event Poller

### Automatic Integration

The RPC Queue Service is automatically integrated with the Soroban Event Poller:

```javascript
// In sorobanEventPollerService.js
this.rpcQueueService = new RpcQueueService(options);

// Start service
await this.rpcQueueService.start();

// Use for RPC calls
const events = await this.fetchEventsInRange(startLedger, endLedger);
```

### Fallback Behavior

- **Queue Available**: All RPC calls go through queue system
- **Queue Unavailable**: Falls back to direct RPC calls
- **Queue Failure**: Logs error and continues with direct calls

### Performance Benefits

- **Reliability**: Failed calls don't halt the indexer
- **Throughput**: Concurrent processing of RPC calls
- **Monitoring**: Comprehensive failure tracking
- **Recovery**: Manual retry capabilities for failed jobs

## Error Handling

### RPC Call Failures

#### Network Timeouts
```javascript
// Automatic retry with exponential backoff
// After 3 failures: move to DLQ
```

#### RPC Errors
```javascript
// Server errors (5xx): retry
// Client errors (4xx): no retry, move to DLQ
// Network errors: retry
```

#### Validation Errors
```javascript
// Invalid parameters: no retry, move to DLQ immediately
```

### Queue Failures

#### Redis Connection Issues
```javascript
// Automatic reconnection
// Circuit breaker pattern
// Fallback to direct RPC calls
```

#### BullMQ Worker Issues
```javascript
// Worker restart
// Job isolation
// Error logging to Sentry
```

## Performance Considerations

### Queue Configuration

#### Concurrency Settings
```javascript
// Main queue: 5 workers
// Priority queue: 2 workers  
// DLQ queue: 1 worker
```

#### Rate Limiting
```javascript
// Main queue: 100 jobs/minute
// Priority queue: 20 jobs/minute
// Prevents RPC endpoint overload
```

#### Memory Management
```javascript
// Job history limits
// Completed jobs: 100 per queue
// Failed jobs: 50 per queue
// Automatic cleanup
```

### Redis Optimization

#### Connection Pooling
```javascript
// Single Redis connection for all queues
// Connection reuse
// Automatic failover
```

#### Memory Usage
```javascript
// Job data serialization
// Efficient data structures
// Memory monitoring
```

## Testing

### Test Coverage

#### Unit Tests
- QueueService: Redis connection, queue management
- RpcQueueService: Job processing, retry logic, DLQ handling
- Integration tests: End-to-end job flow

#### Test Scenarios
```javascript
// Successful RPC job processing
// RPC call failures and retries
// DLQ job creation and processing
// Queue health monitoring
// API endpoint functionality
```

#### Mock Testing
```javascript
// Mock Redis and BullMQ
// Mock RPC clients
// Mock Slack webhooks
// Isolated unit testing
```

### Running Tests

```bash
# Run all queue tests
npm test -- queueService.test.js rpcQueueService.test.js

# Run specific test file
npm test -- rpcQueueService.test.js

# Run with coverage
npm test -- --coverage -- testNamePattern="queue"
```

## Troubleshooting

### Common Issues

#### High DLQ Growth
```bash
# Check DLQ size
GET /api/rpc-queue/dlq/jobs

# Common causes:
# - RPC endpoint issues
# - Network connectivity problems
# - Invalid job parameters
# - Rate limiting
```

#### Queue Backlog
```bash
# Check queue stats
GET /api/rpc-queue/status

# Solutions:
# - Increase worker concurrency
# - Check RPC endpoint performance
# - Verify Redis capacity
# - Monitor job processing times
```

#### Redis Connection Issues
```bash
# Check Redis status
GET /api/rpc-queue/health

# Troubleshooting:
# - Verify Redis connectivity
# - Check Redis configuration
# - Monitor Redis memory usage
# - Check network connectivity
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=queue:* rpc-queue:* npm start
```

### Manual Recovery

For critical issues:

1. **Pause Queues**: Stop new job processing
2. **Clear DLQ**: Remove problematic jobs
3. **Reset Stats**: Clear corrupted statistics
4. **Restart Service**: Fresh start with clean state

```bash
POST /api/rpc-queue/queues/pause
POST /api/rpc-queue/dlq/clear
POST /api/rpc-queue/stats/reset
# Restart service
```

## Security Considerations

### Access Control

#### API Authentication
- Follow existing authentication patterns
- Admin-only endpoints for critical operations
- Rate limiting for API endpoints

#### Data Protection
- Sensitive data in job parameters
- RPC endpoint URLs in logs
- Error message sanitization

### Monitoring Security

#### Audit Logging
- All DLQ operations logged
- Manual job submissions tracked
- Configuration changes recorded

#### Alert Security
- No sensitive data in Slack alerts
- Error message sanitization
- Rate limiting for alert generation

## Future Enhancements

### Planned Features

1. **Job Prioritization**: Dynamic priority based on urgency
2. **Circuit Breaker**: Automatic RPC endpoint failover
3. **Metrics Export**: Prometheus metrics integration
4. **Web Dashboard**: Real-time queue monitoring UI
5. **Auto-retry**: Scheduled retry of DLQ jobs

### Extensibility

#### Custom Processors
```javascript
// Custom job processors
const customProcessor = async (job) => {
  // Custom processing logic
};
```

#### Custom Alerting
```javascript
// Custom alert handlers
const customAlert = (dlqJob) => {
  // Custom alert logic
};
```

#### Queue Plugins
```javascript
// Plugin architecture
queueService.addPlugin('custom-middleware', middleware);
```

## Best Practices

### Operational

1. **Monitor DLQ Growth**: Watch for unusual failure patterns
2. **Set Up Alerts**: Configure Slack alerts for critical failures
3. **Regular Health Checks**: Monitor queue and Redis health
4. **Performance Tuning**: Adjust concurrency based on load

### Development

1. **Test Thoroughly**: Comprehensive test coverage for all scenarios
2. **Error Handling**: Robust error handling and logging
3. **Configuration**: Environment-based configuration
4. **Documentation**: Keep documentation up to date

### Deployment

1. **Staging Testing**: Test in staging before production
2. **Redis Setup**: Proper Redis configuration and monitoring
3. **Resource Planning**: Adequate Redis memory and CPU
4. **Monitoring**: Deploy with monitoring in place

This comprehensive Dead Letter Queue system ensures reliable RPC call processing, prevents indexer halts due to network issues, and provides robust monitoring and recovery capabilities for the Soroban Event Poller infrastructure.
