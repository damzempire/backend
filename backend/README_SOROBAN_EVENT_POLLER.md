# Soroban RPC Event Poller Service

A robust background service for polling Soroban RPC for specific VestingScheduleCreated and TokensClaimed events with automatic ledger sequence tracking and resume capability.

## Overview

The Soroban Event Poller Service consists of two main components:

1. **SorobanEventPollerService** - Polls the Soroban RPC for events and stores them in the database
2. **SorobanEventProcessor** - Processes stored events and updates business logic

## Features

- **Automatic Ledger Tracking**: Tracks the last ingested ledger sequence in the database for safe resume after restarts
- **Event Filtering**: Monitors specific contract addresses and event types (VestingScheduleCreated, TokensClaimed)
- **Batch Processing**: Efficiently processes events in configurable batches
- **Error Handling**: Comprehensive error handling with retry mechanisms and Sentry integration
- **Monitoring**: Built-in status endpoints and statistics
- **Graceful Shutdown**: Clean service startup and shutdown procedures

## Architecture

```
Soroban RPC Event Poller Service
    |
    |-- SorobanEventPollerService
    |   |-- Polls Soroban RPC every N seconds
    |   |-- Fetches events in ledger ranges
    |   |-- Stores events in soroban_events table
    |   `-- Tracks last processed ledger sequence
    |
    |-- SorobanEventProcessor
    |   |-- Processes unprocessed events in batches
    |   |-- Updates business logic (ClaimsHistory, SubSchedule)
    |   `-- Handles processing errors and retries
    |
    `-- SorobanRpcClient
        |-- RPC client wrapper with retry logic
        |-- Health checks and error handling
        `-- Supports all Soroban RPC methods
```

## Database Schema

### soroban_events Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_type | ENUM | 'VestingScheduleCreated' or 'TokensClaimed' |
| contract_address | STRING | Soroban contract address |
| transaction_hash | STRING | Transaction hash |
| ledger_sequence | BIGINT | Ledger sequence number |
| event_body | JSONB | Raw event data |
| processed | BOOLEAN | Whether processed by business logic |
| processing_error | TEXT | Error message if processing failed |
| event_timestamp | DATE | Event timestamp |
| created_at | DATE | Record creation time |
| updated_at | DATE | Record update time |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `SOROBAN_RPC_URL` | Required | Soroban RPC endpoint URL |
| `SOROBAN_POLL_INTERVAL` | 30000 | Polling interval in milliseconds |
| `SOROBAN_BATCH_SIZE` | 100 | Maximum ledgers to fetch per poll |
| `SOROBAN_PROCESSOR_BATCH_SIZE` | 50 | Events to process per batch |
| `SOROBAN_PROCESSOR_DELAY` | 1000 | Delay between batches (ms) |
| `SOROBAN_CONTRACT_ADDRESSES` | - | Comma-separated contract addresses to monitor |

## API Endpoints

### GET /api/soroban-events

Get Soroban events with pagination and filtering.

Query parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `eventType` - Filter by event type
- `contractAddress` - Filter by contract address
- `processed` - Filter by processed status
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `ledgerSequence` - Filter by ledger sequence

### GET /api/soroban-events/:id

Get specific event by ID.

### GET /api/soroban-events/service/status

Get service status and statistics.

### POST /api/soroban-events/retry-failed

Retry failed events (up to specified limit).

### POST /api/soroban-events/contracts/:address

Add contract address to monitoring.

### DELETE /api/soroban-events/contracts/:address

Remove contract address from monitoring.

### GET /api/soroban-events/statistics/by-type

Get event statistics grouped by type.

## Event Processing

### VestingScheduleCreated Event

When a VestingScheduleCreated event is detected:

1. Extract event data (vault_id, beneficiary_address, token_address, etc.)
2. Validate required fields
3. Check if vault exists
4. Create or update beneficiary record
5. Create SubSchedule record with vesting details
6. Update cache

### TokensClaimed Event

When a TokensClaimed event is detected:

1. Extract event data (beneficiary_address, token_address, amount_claimed)
2. Validate required fields
3. Create ClaimsHistory record
4. Update SubSchedule with claimed amount (if vault_id provided)

## Error Handling

The service includes comprehensive error handling:

- **RPC Errors**: Automatic retry with exponential backoff
- **Database Errors**: Transaction rollback and Sentry logging
- **Processing Errors**: Event marked as failed with error message
- **Network Issues**: Health checks and graceful degradation

## Monitoring

### Service Status

Check service health and statistics:

```bash
curl http://localhost:4000/api/soroban-events/service/status
```

Response includes:
- Poller and processor status
- Processing statistics
- Database event counts
- Service uptime

### Logs

The service logs important events:
- Service start/stop
- Polling activity
- Event processing results
- Errors and warnings

### Sentry Integration

All errors are automatically sent to Sentry with:
- Service tags
- Event context
- Error details

## Deployment

### Database Migration

Run the migration to create the soroban_events table:

```bash
npx sequelize-cli db:migrate --migrations-path ./migrations
```

### Environment Setup

Configure environment variables:

```bash
# Required
SOROBAN_RPC_URL=https://horizon-testnet.stellar.org/soroban/rpc

# Optional
SOROBAN_POLL_INTERVAL=30000
SOROBAN_BATCH_SIZE=100
SOROBAN_PROCESSOR_BATCH_SIZE=50
SOROBAN_PROCESSOR_DELAY=1000
SOROBAN_CONTRACT_ADDRESSES=contract1,contract2,contract3
```

### Service Integration

The services are automatically started with the main application in `src/index.js`:

```javascript
// Initialize Soroban Event Poller Service
const sorobanEventPoller = new SorobanEventPollerService({
  pollInterval: parseInt(process.env.SOROBAN_POLL_INTERVAL) || 30000,
  batchSize: parseInt(process.env.SOROBAN_BATCH_SIZE) || 100,
  contractAddresses: process.env.SOROBAN_CONTRACT_ADDRESSES ? 
    process.env.SOROBAN_CONTRACT_ADDRESSES.split(',') : []
});

const sorobanEventProcessor = new SorobanEventProcessor({
  batchSize: parseInt(process.env.SOROBAN_PROCESSOR_BATCH_SIZE) || 50,
  processingDelay: parseInt(process.env.SOROBAN_PROCESSOR_DELAY) || 1000
});

await sorobanEventPoller.start();
await sorobanEventProcessor.startProcessing();
```

## Testing

Run the test suite:

```bash
npm test -- sorobanEventPollerService.test.js
```

The tests cover:
- Service initialization
- Event polling and processing
- Error handling
- Database operations
- API endpoints

## Troubleshooting

### Common Issues

1. **RPC Connection Failed**
   - Check SOROBAN_RPC_URL configuration
   - Verify network connectivity
   - Check RPC endpoint health

2. **Events Not Processing**
   - Check service status endpoint
   - Verify contract addresses are configured
   - Check for processing errors in database

3. **Database Errors**
   - Run database migrations
   - Check database connection
   - Verify table permissions

4. **High Memory Usage**
   - Reduce batch sizes
   - Increase processing delays
   - Monitor event volume

### Debug Mode

Enable debug logging:

```bash
DEBUG=soroban:* npm start
```

## Performance Considerations

- **Batch Size**: Adjust based on network and database performance
- **Polling Interval**: Balance between real-time updates and resource usage
- **Contract Filtering**: Monitor only relevant contracts to reduce noise
- **Database Indexing**: Ensure proper indexes on queried columns

## Security

- **RPC Authentication**: Use authenticated RPC endpoints when available
- **Input Validation**: All event data is validated before processing
- **Error Sanitization**: Sensitive information is not logged
- **Access Control**: API endpoints follow existing authentication patterns

## Future Enhancements

- Event replay functionality
- Real-time event streaming via WebSocket
- Advanced event filtering and routing
- Performance metrics and alerting
- Multi-network support
