# Shadow-Indexing Mode Implementation

## Overview

This document outlines the complete implementation of the 'Shadow-Indexing' Mode for Real-Time Consistency Monitoring as requested in issue #318. The implementation provides enhanced reliability and precision handling for linear vesting through parallel indexing and consistency validation.

## Implementation Summary

### 🎯 **Objective Achieved**
Successfully implemented a comprehensive shadow-indexing system that runs parallel to the main indexer, providing real-time consistency monitoring and automatic failover capabilities.

### 📁 **Files Created/Modified**

#### New Files Created:
1. **`src/services/shadowIndexer.js`** - Parallel shadow indexer implementation
2. **`src/services/consistencyMonitor.js`** - Real-time consistency monitoring service
3. **`src/api/server.js`** - REST API for monitoring and management
4. **`tests/shadowIndexing.test.js`** - Comprehensive test suite
5. **`SHADOW_INDEXING_IMPLEMENTATION.md`** - This documentation

#### Modified Files:
1. **`src/services/sorobanIndexer.js`** - Enhanced with event handling and data storage
2. **`src/index.js`** - Integrated shadow-indexing into main application
3. **`src/config/index.js`** - Added shadow-indexing configuration
4. **`.env.example`** - Added shadow-indexing environment variables
5. **`package.json`** - Added required dependencies
6. **`README.md`** - Updated with comprehensive documentation

## 🏗️ **Architecture Overview**

### Core Components

```
┌─────────────────┐    ┌─────────────────┐
│   Main Indexer  │    │  Shadow Indexer │
│   (Primary)     │    │   (Secondary)   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
          ┌─────────────────┐
          │ConsistencyMonitor│
          │                 │
          │ • Validation    │
          │ • Comparison   │
          │ • Alerting     │
          └─────────┬───────┘
                    │
          ┌─────────────────┐
          │  AlertManager   │
          │                 │
          │ • Webhook       │
          │ • Email         │
          │ • Recovery      │
          └─────────────────┘
```

### Data Flow

1. **Parallel Processing**: Both indexers process the same ledgers independently
2. **Cross-Validation**: ConsistencyMonitor compares results in real-time
3. **Inconsistency Detection**: Identifies mismatches and categorizes severity
4. **Alerting**: Sends appropriate alerts based on threshold configurations
5. **Failover**: Automatically switches to shadow indexer on critical issues

## 🔧 **Key Features Implemented**

### 1. **Shadow Indexer Service**
- **Parallel Processing**: Runs alongside main indexer with independent data processing
- **Event-Driven Architecture**: Emits events for real-time monitoring
- **Data Validation**: Stores ledger and transaction data for consistency checks
- **Performance Metrics**: Tracks processing time and statistics

### 2. **Consistency Monitor Service**
- **Real-Time Validation**: Cross-validates data between main and shadow indexers
- **Inconsistency Categorization**: 
  - Critical: Ledger hash mismatches, missing ledgers
  - Warning: Transaction count differences, missing transactions
- **Threshold-Based Alerting**: Configurable thresholds for different severity levels
- **Historical Tracking**: Maintains validation history and trends

### 3. **Enhanced Alerting System**
- **Consistency-Specific Alerts**: New alert types for consistency issues
- **Failover Notifications**: Automatic alerts when switching to shadow indexer
- **Recovery Alerts**: Notifications when consistency is restored
- **Detailed Reporting**: Comprehensive alert details with affected ledgers

### 4. **REST API Endpoints**
- **`GET /api/status`**: Comprehensive system status with shadow-indexing metrics
- **`POST /api/consistency-check`**: Manual consistency validation trigger
- **`POST /api/switch-to-main`**: Manual switch back to main indexer
- **`GET /api/consistency-history`**: Historical consistency data
- **`GET /api/consistency-report`**: Detailed consistency metrics

### 5. **Configuration Management**
- **Shadow-Indexing Toggle**: Enable/disable shadow-indexing mode
- **Threshold Configuration**: Customizable inconsistency thresholds
- **Timing Controls**: Configurable validation and indexing intervals
- **Failover Settings**: Automatic failover configuration

## 📊 **Consistency Validation Logic**

### Validation Types

1. **Ledger Hash Validation**
   ```javascript
   if (shadowData.hash !== mainData.hash) {
     // Critical inconsistency detected
   }
   ```

2. **Transaction Count Validation**
   ```javascript
   if (shadowData.transaction_count !== mainData.transaction_count) {
     // Warning inconsistency detected
   }
   ```

3. **Transaction Hash Validation**
   ```javascript
   const missingTransactions = shadowTxHashes.filter(hash => !mainTxHashes.has(hash));
   ```

### Inconsistency Categories

| Type | Severity | Description | Action |
|------|----------|-------------|--------|
| `LEDGER_HASH_MISMATCH` | Critical | Different ledger hashes | Immediate alert |
| `MISSING_LEDGER` | Critical | Ledger exists in one indexer only | Immediate alert |
| `TRANSACTION_COUNT_MISMATCH` | Warning | Different transaction counts | Warning alert |
| `MISSING_TRANSACTIONS_IN_MAIN` | Warning | Transactions missing in main | Warning alert |
| `MISSING_TRANSACTIONS_IN_SHADOW` | Warning | Transactions missing in shadow | Warning alert |

## 🚨 **Alerting System**

### Alert Types

1. **CRITICAL_CONSISTENCY_ISSUE**
   - Triggered when critical inconsistency count exceeds threshold
   - Includes detailed inconsistency report
   - Recommends immediate investigation

2. **CONSISTENCY_WARNING**
   - Triggered when warning inconsistency count exceeds threshold
   - Includes affected ledger information
   - Recommends monitoring

3. **FAILOVER_REQUIRED**
   - Triggered when failover threshold is exceeded
   - Includes consistency report
   - Recommends immediate failover

4. **FAILOVER_COMPLETED**
   - Sent when automatic failover is completed
   - Includes reason and timestamp
   - Confirms active indexer switch

5. **CONSISTENCY_RECOVERY**
   - Sent when consistency is restored after issues
   - Includes recovery metrics
   - Confirms system stability

## 🔄 **Failover Mechanism**

### Automatic Failover
```javascript
async handleFailover(report) {
  // 1. Stop main indexer
  this.indexer.stopIndexing();
  
  // 2. Switch active indexer
  this.activeIndexer = this.shadowIndexer;
  
  // 3. Send failover alert
  await this.alertManager.sendAlert({
    type: 'FAILOVER_COMPLETED',
    severity: 'HIGH',
    message: 'Failover to shadow indexer completed'
  });
}
```

### Manual Recovery
```javascript
async switchToMainIndexer() {
  // 1. Stop shadow indexer
  this.shadowIndexer.stopIndexing();
  
  // 2. Start main indexer
  await this.indexer.startIndexing();
  
  // 3. Switch active indexer
  this.activeIndexer = this.indexer;
}
```

## ⚙️ **Configuration Options**

### Environment Variables

```env
# Shadow-Indexing Configuration
SHADOW_INDEXING_ENABLED=true                    # Enable shadow-indexing mode
SHADOW_INDEXING_INTERVAL=3000                   # Shadow indexer polling interval (ms)
SHADOW_VALIDATION_INTERVAL=30                    # Consistency check interval (seconds)
CRITICAL_INCONSISTENCY_COUNT=5                   # Critical issues threshold
WARNING_INCONSISTENCY_COUNT=2                    # Warning issues threshold
FAILOVER_THRESHOLD=10                           # Auto-failover threshold
AUTO_FAILOVER=false                             # Enable automatic failover
SYNC_ON_STARTUP=true                            # Sync indexers on startup
```

### Default Thresholds

| Parameter | Default | Description |
|-----------|---------|-------------|
| `CRITICAL_INCONSISTENCY_COUNT` | 5 | Critical issues before alert |
| `WARNING_INCONSISTENCY_COUNT` | 2 | Warning issues before alert |
| `FAILOVER_THRESHOLD` | 10 | Critical issues before failover |
| `SHADOW_VALIDATION_INTERVAL` | 30s | Consistency check frequency |
| `SHADOW_INDEXING_INTERVAL` | 3000ms | Shadow indexer polling |

## 📈 **Monitoring & Metrics**

### Key Metrics

1. **Consistency Rate**: Percentage of ledgers matching between indexers
2. **Inconsistency Count**: Number of detected inconsistencies
3. **Validation Frequency**: How often checks are performed
4. **Processing Time Difference**: Performance comparison
5. **Failover Events**: Number of failover occurrences

### API Monitoring

```bash
# Get comprehensive status
curl http://localhost:3000/api/status

# Trigger manual consistency check
curl -X POST http://localhost:3000/api/consistency-check

# Get consistency history
curl http://localhost:3000/api/consistency-history?limit=10
```

## 🧪 **Testing Implementation**

### Test Coverage

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: End-to-end workflow testing
3. **Consistency Validation**: Inconsistency detection testing
4. **Failover Testing**: Automatic failover simulation

### Test Categories

```javascript
describe('Shadow-Indexing Mode Tests', () => {
  describe('ShadowIndexer', () => {
    // Test shadow indexer functionality
  });
  
  describe('ConsistencyMonitor', () => {
    // Test consistency monitoring
  });
  
  describe('Integration Tests', () => {
    // Test complete workflow
  });
});
```

## 🚀 **Deployment Instructions**

### 1. Installation
```bash
npm install
```

### 2. Configuration
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Application
```bash
npm start
```

### 4. Verify Shadow-Indexing
```bash
curl http://localhost:3000/api/status
```

## 🔍 **Troubleshooting**

### Common Issues

1. **Shadow Indexer Not Starting**
   - Check `SHADOW_INDEXING_ENABLED=true`
   - Verify Soroban network connectivity

2. **Consistency Check Failures**
   - Check network connectivity to Horizon API
   - Verify both indexers are processing same ledgers

3. **High Inconsistency Rate**
   - Check network stability
   - Verify indexer configurations
   - Review logs for specific error patterns

### Debug Mode

```env
LOG_LEVEL=debug
SHADOW_INDEXING_ENABLED=true
```

## 📋 **Implementation Checklist**

- [x] **Shadow Indexer Service**: Parallel indexer with event handling
- [x] **Consistency Monitor**: Real-time validation and monitoring
- [x] **Enhanced Alerting**: Consistency-specific alert types
- [x] **API Endpoints**: REST API for monitoring and management
- [x] **Configuration**: Comprehensive shadow-indexing configuration
- [x] **Documentation**: Updated README and implementation docs
- [x] **Testing**: Comprehensive test suite
- [x] **Integration**: Full integration into main application
- [x] **Failover Logic**: Automatic and manual failover mechanisms
- [x] **Performance Metrics**: Detailed statistics and monitoring

## 🎯 **Benefits Achieved**

1. **Enhanced Reliability**: Dual indexer architecture ensures data integrity
2. **Real-Time Monitoring**: Immediate detection of consistency issues
3. **Automatic Failover**: Seamless switching to backup indexer
4. **Comprehensive Alerting**: Detailed notifications for all scenarios
5. **Performance Tracking**: Detailed metrics and historical data
6. **Easy Management**: REST API for monitoring and control
7. **Flexible Configuration**: Customizable thresholds and timing
8. **Production Ready**: Comprehensive testing and documentation

## 🔄 **Future Enhancements**

1. **Multi-Shadow Indexers**: Support for multiple shadow indexers
2. **Machine Learning**: Predictive inconsistency detection
3. **Dashboard**: Web-based monitoring dashboard
4. **Database Integration**: Persistent storage for consistency data
5. **Advanced Analytics**: Trend analysis and reporting

---

**Implementation Status**: ✅ **COMPLETE**

The Shadow-Indexing Mode for Real-Time Consistency Monitoring has been successfully implemented and is ready for production deployment. The system provides comprehensive reliability enhancements while maintaining backward compatibility with the existing Soroban Indexer infrastructure.
