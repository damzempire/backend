# Ledger Reorganization and Rollback Handling

A comprehensive system for detecting and handling ledger reorganizations, forks, and network inconsistencies in the Soroban Event Poller infrastructure.

## Overview

The ledger reorganization handling system provides automatic detection and recovery from blockchain network issues including:
- Ledger reorganizations (reorgs)
- Network forks
- RPC node inconsistencies
- Sequence gaps
- Orphaned blocks

## Architecture

```
Ledger Reorg Handling System
    |
    |-- LedgerReorgDetector
    |   |-- Continuous monitoring for reorgs
    |   |-- Ledger hash comparison
    |   |-- Gap detection
    |   |-- Automatic rollback triggers
    |   `-- Alerting and monitoring
    |
    |-- LedgerResyncService
    |   |-- Full resync from finalized ledger
    |   |-- Targeted resync for specific ranges
    |   |-- Batch processing with progress tracking
    |   `-- Integrity validation
    |
    `-- Integration with SorobanEventPoller
        |-- Automatic reorg checks during polling
        |-- Coordinated pause/resume operations
        `-- Unified status monitoring
```

## Components

### 1. LedgerReorgDetector

**Purpose**: Continuously monitors for ledger reorganizations and network inconsistencies.

**Features**:
- **Reorg Detection**: Compares cached ledger hashes with network state
- **Gap Detection**: Identifies sequence gaps between database and network
- **Fork Identification**: Detects when network state diverges from cached state
- **Orphaned Event Detection**: Finds events from blocks that no longer exist
- **Automatic Rollback**: Triggers rollback when issues are detected
- **Alerting**: Sends notifications for different severity levels

**Configuration**:
```javascript
const detector = new LedgerReorgDetector({
  maxReorgDepth: 100,        // Maximum reorg depth to detect
  finalityThreshold: 32,     // Ledgers to wait for finality
  gapDetectionThreshold: 3,  // Consecutive gaps before alert
  checkInterval: 60000       // Check every minute
});
```

### 2. LedgerResyncService

**Purpose**: Performs database resynchronization when reorgs or inconsistencies are detected.

**Features**:
- **Full Resync**: Complete resync from last finalized ledger
- **Targeted Resync**: Resync specific ledger ranges
- **Batch Processing**: Efficient processing of large ranges
- **Progress Tracking**: Real-time progress monitoring
- **Integrity Validation**: Pre and post-resync integrity checks
- **Transaction Safety**: Atomic rollback operations

**Configuration**:
```javascript
const resyncService = new LedgerResyncService({
  finalityThreshold: 32,     // Ledgers to wait for finality
  resyncBatchSize: 50,       // Ledgers per batch
  maxResyncDepth: 1000,      // Maximum resync depth
  resyncDelay: 1000          // Delay between batches
});
```

## Detection Mechanisms

### 1. Ledger Hash Comparison

The system maintains a cache of recent ledger hashes and compares them against the current network state:

```javascript
// Fork detection example
if (cachedHash !== networkHash) {
  // Fork detected at this sequence
  handleFork(sequence, cachedHash, networkHash);
}
```

### 2. Sequence Gap Detection

Monitors for gaps between the last processed ledger and the current network state:

```javascript
// Gap detection
if (networkSequence < lastProcessedSequence) {
  // Potential rollback
  handleRollback(expectedSequence, actualSequence);
} else if (networkSequence > lastProcessedSequence + threshold) {
  // Large gap detected
  handleLargeGap(expectedSequence, actualSequence);
}
```

### 3. Database Consistency Checks

Validates database integrity by checking for:
- Duplicate ledger sequences
- Out-of-order sequences
- Orphaned events beyond network state

## Recovery Procedures

### 1. Automatic Rollback

When a reorg or fork is detected, the system automatically:

1. **Pauses Event Polling**: Stops further event ingestion
2. **Calculates Safe Point**: Determines the safe rollback point
3. **Executes Rollback**: Removes affected records from all tables
4. **Updates Indexer State**: Resets ledger sequence tracking
5. **Clears Cache**: Removes invalidated ledger hashes
6. **Sends Alert**: Notifies administrators of the action

### 2. Full Resync Process

For major inconsistencies, a full resync is performed:

1. **Validate Current State**: Check database and network consistency
2. **Calculate Safe Start**: Determine safe starting point (latest - finality)
3. **Rollback to Safe Point**: Remove records beyond safe point
4. **Batch Resync**: Process ledgers in batches from safe point to latest
5. **Validate Result**: Ensure resync completed successfully
6. **Resume Operations**: Restart normal event polling

### 3. Targeted Resync

For specific issues, targeted resync can be performed:

1. **Specify Range**: Define exact ledger range to resync
2. **Rollback Range**: Remove records in specified range
3. **Resync Range**: Re-process events in range
4. **Validate Range**: Ensure range consistency

## API Endpoints

### Status and Monitoring

```bash
# Get overall status
GET /api/ledger-reorg/status

# Validate ledger integrity
GET /api/ledger-reorg/integrity

# Get recent issues
GET /api/ledger-reorg/issues?limit=10

# Get ledger cache info
GET /api/ledger-reorg/ledger-cache
```

### Manual Operations

```bash
# Trigger manual reorg check
POST /api/ledger-reorg/check

# Perform full resync
POST /api/ledger-reorg/resync/full

# Perform targeted resync
POST /api/ledger-reorg/resync/targeted
{
  "startSequence": 950,
  "endSequence": 1000
}

# Get resync progress
GET /api/ledger-reorg/resync/progress

# Cancel ongoing resync
POST /api/ledger-reorg/resync/cancel

# Force rollback (admin only)
POST /api/ledger-reorg/rollback/950
```

## Configuration

### Environment Variables

```bash
# Reorg Detector Configuration
SOROBAN_REORG_MAX_DEPTH=100
SOROBAN_REORG_FINALITY_THRESHOLD=32
SOROBAN_REORG_CHECK_INTERVAL=60000
SOROBAN_REORG_GAP_THRESHOLD=3

# Resync Service Configuration
SOROBAN_RESYNC_FINALITY_THRESHOLD=32
SOROBAN_RESYNC_BATCH_SIZE=50
SOROBAN_RESYNC_MAX_DEPTH=1000
SOROBAN_RESYNC_DELAY=1000
```

### Service Integration

The services are automatically integrated with the Soroban Event Poller:

```javascript
// In sorobanEventPollerService.js
this.reorgDetector = new LedgerReorgDetector(options);
this.resyncService = new LedgerResyncService(options);

// Automatic startup
await this.reorgDetector.start();

// Reorg checks during polling
const reorgCheck = await this.reorgDetector.triggerCheck();
if (reorgCheck.issues.length > 0) {
  // Skip polling to allow reorg handling
  return;
}
```

## Alerting and Monitoring

### Alert Types

1. **Critical Alerts** (Forks, Major Reorgs)
   - Channel: `#critical-alerts`
   - Priority: Critical
   - Immediate attention required

2. **High Priority Alerts** (Rollbacks, Large Gaps)
   - Channel: `#alerts`
   - Priority: High
   - Investigation required

3. **Medium Priority Alerts** (Sequence Inconsistencies)
   - Channel: `#alerts`
   - Priority: Medium
   - Monitoring recommended

4. **Low Priority Alerts** (Orphaned Events Cleanup)
   - Channel: `#alerts`
   - Priority: Low
   - Informational

### Monitoring Metrics

The system provides comprehensive monitoring:

```javascript
// Reorg Detector Status
{
  isRunning: true,
  checkInterval: 60000,
  maxReorgDepth: 100,
  consecutiveGaps: 0,
  ledgerHashesCacheSize: 50,
  lastCheckTime: "2024-01-01T12:00:00Z",
  uptime: 86400000
}

// Resync Service Status
{
  isResyncing: false,
  finalityThreshold: 32,
  resyncBatchSize: 50,
  maxResyncDepth: 1000,
  resyncProgress: null
}
```

## Database Impact

### Tables Affected

During rollback operations, the following tables are affected:

1. **soroban_events**: Events beyond rollback point are deleted
2. **claims_history**: Claims beyond rollback point are deleted
3. **sub_schedules**: Schedules beyond rollback point are deleted
4. **indexer_state**: All indexer states are updated to rollback point

### Transaction Safety

All rollback operations are wrapped in database transactions:

```javascript
const t = await sequelize.transaction();
try {
  // Delete records from all tables
  await SorobanEvent.destroy({ where: { ledger_sequence: { [Op.gt]: targetSequence } }, transaction: t });
  await ClaimsHistory.destroy({ where: { block_number: { [Op.gt]: targetSequence } }, transaction: t });
  await SubSchedule.destroy({ where: { block_number: { [Op.gt]: targetSequence } }, transaction: t });
  
  // Update indexer states
  await IndexerState.update({ last_ingested_ledger: targetSequence }, { transaction: t });
  
  await t.commit();
} catch (error) {
  await t.rollback();
  throw error;
}
```

## Performance Considerations

### Reorg Detection

- **Check Frequency**: Balance between detection speed and resource usage
- **Cache Size**: Maintain sufficient ledger hash cache for fork detection
- **Network Calls**: Minimize RPC calls during normal operation

### Resync Operations

- **Batch Size**: Adjust based on network and database performance
- **Processing Delay**: Prevent overwhelming RPC endpoints
- **Progress Tracking**: Monitor long-running resync operations

### Database Optimization

- **Indexes**: Proper indexes on ledger_sequence columns
- **Transaction Size**: Keep transactions manageable
- **Cleanup**: Regular cleanup of old ledger hashes

## Testing

### Test Scenarios

The test suite covers:

1. **Reorg Detection**: Fork and rollback detection
2. **Gap Detection**: Various gap scenarios
3. **Sequence Inconsistencies**: Duplicates and out-of-order sequences
4. **Orphaned Events**: Events beyond network state
5. **Rollback Operations**: Successful and failed rollbacks
6. **Resync Operations**: Full and targeted resyncs
7. **Integrity Validation**: Database consistency checks

### Running Tests

```bash
# Run reorg detector tests
npm test -- ledgerReorgDetector.test.js

# Run resync service tests
npm test -- ledgerResyncService.test.js

# Run all reorg-related tests
npm test -- --testNamePattern="reorg|resync"
```

## Troubleshooting

### Common Issues

1. **Frequent Reorg Detections**
   - Check RPC endpoint stability
   - Verify network connectivity
   - Adjust finality threshold

2. **Resync Failures**
   - Check database connection
   - Verify RPC endpoint availability
   - Review batch size configuration

3. **Performance Issues**
   - Reduce check frequency
   - Optimize database indexes
   - Adjust batch sizes

4. **Alert Fatigue**
   - Adjust alert thresholds
   - Review false positive patterns
   - Fine-tune detection parameters

### Debug Mode

Enable debug logging:

```bash
DEBUG=ledger-reorg:* npm start
```

### Manual Recovery

For manual recovery scenarios:

1. **Stop Services**: Stop event poller and reorg detector
2. **Assess State**: Check database and network consistency
3. **Manual Rollback**: Use API to rollback to safe point
4. **Manual Resync**: Trigger targeted or full resync
5. **Validate**: Verify integrity before restart
6. **Restart Services**: Resume normal operation

## Security Considerations

### Access Control

- **Admin Endpoints**: Rollback and resync endpoints require admin access
- **API Authentication**: Follow existing authentication patterns
- **Audit Logging**: All manual operations are logged

### Data Integrity

- **Transaction Safety**: All operations use database transactions
- **Validation**: Pre and post-operation integrity checks
- **Rollback Capability**: Ability to undo failed operations

### Monitoring

- **Alert Integration**: Integration with existing alert systems
- **Sentry Tracking**: Error tracking and reporting
- **Performance Metrics**: Resource usage monitoring

## Future Enhancements

### Planned Features

1. **Real-time Event Streaming**: WebSocket-based reorg notifications
2. **Multi-network Support**: Handle multiple blockchain networks
3. **Advanced Analytics**: Reorg pattern analysis and prediction
4. **Automated Recovery**: More sophisticated automated recovery procedures
5. **Performance Optimization**: Caching and batching improvements

### Extensibility

The system is designed to be extensible:

- **Plugin Architecture**: Add custom detection rules
- **Event Handlers**: Custom reorg event processing
- **Alert Integrations**: Support for additional alert systems
- **Metrics Export**: Integration with monitoring systems

## Best Practices

### Operational

1. **Regular Monitoring**: Monitor reorg detection and resync operations
2. **Alert Response**: Respond promptly to critical alerts
3. **Performance Tuning**: Adjust configuration based on usage patterns
4. **Testing**: Regularly test recovery procedures

### Development

1. **Test Coverage**: Maintain comprehensive test coverage
2. **Error Handling**: Robust error handling and logging
3. **Documentation**: Keep documentation up to date
4. **Code Review**: Review changes for impact on reorg handling

### Deployment

1. **Staging Testing**: Test changes in staging environment
2. **Rollback Plan**: Have deployment rollback plan
3. **Monitoring**: Deploy with monitoring in place
4. **Documentation**: Update deployment documentation

This comprehensive ledger reorganization handling system ensures robust operation of the Soroban Event Poller infrastructure, providing automatic detection and recovery from network inconsistencies while maintaining data integrity and operational continuity.
