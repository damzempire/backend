# Soroban Indexer with Shadow-Indexing Mode

A robust monitoring and alerting system for the Soroban Indexer that tracks indexing lag, ensures data consistency through shadow-indexing, and sends notifications when issues are detected.

## Features

### Core Features
- **Real-time Lag Monitoring**: Continuously monitors the difference between the current blockchain ledger and the indexed ledger
- **Shadow-Indexing Mode**: Parallel indexing with real-time consistency validation
- **Automatic Failover**: Switches to shadow indexer when critical inconsistencies are detected
- **Configurable Thresholds**: Set custom lag thresholds and monitoring intervals
- **Multi-channel Alerting**: Supports webhook (Slack, Discord, etc.) and email notifications
- **Alert Cooldown**: Prevents alert spam with configurable cooldown periods
- **Recovery Notifications**: Automatically sends recovery alerts when lag returns to normal levels
- **Graceful Shutdown**: Clean shutdown handling for production deployments
- **Comprehensive Logging**: Structured logging with Winston for debugging and monitoring

### Shadow-Indexing Features
- **Dual Indexer Architecture**: Main and shadow indexers running in parallel
- **Real-time Consistency Monitoring**: Cross-validation of ledger data and transactions
- **Inconsistency Detection**: Identifies missing ledgers, hash mismatches, and transaction discrepancies
- **Enhanced Alerting**: Specific alerts for consistency issues and failover events
- **Manual Consistency Checks**: Trigger validation checks via API
- **Detailed Reporting**: Comprehensive consistency metrics and history

## Installation

1. Clone the repository:
```bash
git clone https://github.com/damzempire/backend.git
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment configuration:
```bash
cp .env.example .env
```

4. Configure your environment variables (see Configuration section)

5. Start the application:
```bash
npm start
```

For development with auto-restart:
```bash
npm run dev
```

## Configuration

The application uses environment variables for configuration. Copy `.env.example` to `.env` and configure the following:

### Soroban Network Configuration
```env
SOROBAN_RPC_URL=https://rpc.mainnet.stellar.org
SOROBAN_HORIZON_URL=https://horizon.stellar.org
```

### Lag Threshold Configuration
```env
LAG_THRESHOLD_SECONDS=300        # Alert when lag exceeds 5 minutes
MONITORING_INTERVAL_SECONDS=60   # Check lag every minute
ALERT_COOLDOWN_SECONDS=900       # Wait 15 minutes between alerts
```

### Alerting Configuration

#### Webhook (Slack/Discord/etc.)
```env
WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
```

#### Email Notifications
```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
ALERT_EMAIL_RECIPIENTS=admin@example.com,ops@example.com
```

### Shadow-Indexing Configuration
```env
SHADOW_INDEXING_ENABLED=true                    # Enable shadow-indexing mode
SHADOW_INDEXING_INTERVAL=3000                   # Shadow indexer polling interval (ms)
SHADOW_VALIDATION_INTERVAL=30                    # Consistency check interval (seconds)
CRITICAL_INCONSISTENCY_COUNT=5                   # Critical issues threshold
WARNING_INCONSISTENCY_COUNT=2                    # Warning issues threshold
FAILOVER_THRESHOLD=10                           # Auto-failover threshold
AUTO_FAILOVER=false                             # Enable automatic failover
SYNC_ON_STARTUP=true                            # Sync indexers on startup
```

### Logging Configuration
```env
LOG_LEVEL=info
LOG_FILE=logs/indexer.log
```

### API Server Configuration
```env
API_PORT=3000                                   # REST API server port
```

## Architecture

### Core Components

1. **SorobanIndexer**: Handles interaction with Soroban network and ledger tracking
2. **ShadowIndexer**: Parallel indexer for consistency validation and failover
3. **ConsistencyMonitor**: Real-time consistency monitoring between main and shadow indexers
4. **LagMonitor**: Monitors lag thresholds and manages alerting logic
5. **AlertManager**: Manages multi-channel alert delivery (webhook, email)
6. **ApiServer**: REST API for monitoring and management
7. **Configuration**: Centralized configuration management
8. **Logger**: Structured logging with Winston

### Alert Flow

1. LagMonitor checks current vs indexed ledger every `MONITORING_INTERVAL_SECONDS`
2. If lag > `LAG_THRESHOLD_SECONDS`, an alert is triggered
3. AlertManager sends notifications via configured channels
4. Alert cooldown prevents spam for `ALERT_COOLDOWN_SECONDS`
5. Recovery notifications are sent when lag returns to normal

### Shadow-Indexing Flow

1. Main and shadow indexers run in parallel, processing the same ledgers
2. ConsistencyMonitor validates data between indexers every `SHADOW_VALIDATION_INTERVAL`
3. Inconsistencies are categorized and threshold-based alerts are sent
4. Critical inconsistencies trigger failover to shadow indexer
5. Manual consistency checks can be triggered via API

## API Endpoints

### Health Check
```bash
GET /api/health
```
Returns service health status.

### Get Current Status
```bash
GET /api/status
```

Returns comprehensive indexer status including:
- Operating mode (standard/shadow-indexing)
- Active indexer name
- Current ledger number
- Indexed ledger number
- Current lag
- Monitoring status
- Shadow-indexing consistency metrics
- Configuration settings

### Trigger Manual Consistency Check
```bash
POST /api/consistency-check
```

Manually triggers a consistency validation between main and shadow indexers.

### Switch to Main Indexer
```bash
POST /api/switch-to-main
```

Switches back from shadow indexer to main indexer (only available in shadow-indexing mode).

### Test Alert Configuration
```bash
POST /api/test-alert
```

Sends a test alert to verify all configured notification channels are working.

### Get Consistency History
```bash
GET /api/consistency-history?limit=10
```

Returns recent consistency validation history.

### Get Detailed Consistency Report
```bash
GET /api/consistency-report
```

Returns comprehensive consistency metrics and trends.

## Monitoring

### Health Checks

The application provides built-in health monitoring:
- Lag threshold violations
- Alert delivery failures
- Network connectivity issues
- Configuration validation
- Consistency validation failures
- Indexer synchronization status

### Metrics

Key metrics to monitor:
- Current lag time
- Alert frequency
- Alert delivery success rate
- Indexing progress rate
- Consistency rate between main and shadow indexers
- Number of inconsistencies detected
- Failover events
- Validation processing time

### Shadow-Indexing Specific Monitoring

Monitor these additional metrics when shadow-indexing is enabled:
- **Consistency Rate**: Percentage of ledgers that match between main and shadow indexers
- **Inconsistency Types**: Breakdown of different types of inconsistencies detected
- **Validation Frequency**: How often consistency checks are performed
- **Failover Events**: Number of times failover to shadow indexer was triggered
- **Processing Time Difference**: Performance comparison between main and shadow indexers

## Deployment

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

1. Set appropriate log levels for production (`LOG_LEVEL=warn` or `error`)
2. Configure monitoring intervals based on your requirements
3. Set up proper email credentials for production alerts
4. Configure webhook endpoints for your preferred notification channels

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **High False Positive Rate**: Increase `LAG_THRESHOLD_SECONDS` or `MONITORING_INTERVAL_SECONDS`
2. **Missing Alerts**: Check webhook URL and email configuration
3. **Performance Issues**: Reduce monitoring frequency or optimize database queries
4. **Network Errors**: Verify Soroban RPC and Horizon URLs are accessible

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check the logs for detailed error information
- Verify configuration settings are correct
