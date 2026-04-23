# Historical Price Tracking Implementation

## Overview

This implementation provides comprehensive historical price tracking for vesting milestones, enabling accurate cost basis calculations for tax reporting. The system fetches 24-hour VWAP (Volume Weighted Average Price) from the Stellar DEX and maps these prices to every vesting milestone in the database.

## Key Features

### 🎯 Core Functionality
- **Vesting Milestone Tracking**: Automatically generates milestones for cliff ends, vesting increments, and completion events
- **24-Hour VWAP Calculation**: Fetches volume-weighted average prices from Stellar DEX for accurate tax reporting
- **Cost Basis Reports**: Generates comprehensive tax reports showing cost basis for vested tokens
- **Historical Price Caching**: Stores price data locally to minimize API calls and improve performance
- **Automated Processing**: Daily job for milestone generation and price backfilling

### 📊 Tax Compliance
- **IRS-Compliant Reporting**: Provides cost basis at the exact moment of vesting (not claiming)
- **Professional Financial Tool**: Saves users hours of manual data entry for capital gains taxes
- **Audit Trail**: Maintains immutable records with transaction hashes and timestamps
- **Multi-Year Support**: Generates reports for any tax year with vesting activity

## Architecture

### Database Schema

#### 1. Vesting Milestones (`vesting_milestones`)
Tracks each vesting event with price data:
```sql
- id (UUID, Primary Key)
- vault_id (UUID, Foreign Key to vaults)
- sub_schedule_id (UUID, Foreign Key to sub_schedules)
- beneficiary_id (UUID, Foreign Key to beneficiaries)
- milestone_date (TIMESTAMP) -- When vesting occurred
- milestone_type (ENUM: cliff_end, vesting_increment, vesting_complete)
- vested_amount (DECIMAL) -- Amount vested at this milestone
- cumulative_vested (DECIMAL) -- Total vested up to this point
- token_address (VARCHAR) -- Token contract address
- price_usd (DECIMAL) -- Token price in USD at milestone
- vwap_24h_usd (DECIMAL) -- 24-hour VWAP in USD
- price_source (VARCHAR) -- Source of price data
- price_fetched_at (TIMESTAMP) -- When price was fetched
```

#### 2. Historical Token Prices (`historical_token_prices`)
Caches price data to minimize API calls:
```sql
- id (UUID, Primary Key)
- token_address (VARCHAR) -- Token contract address
- price_date (DATE) -- Date for price data
- price_usd (DECIMAL) -- Token price in USD
- vwap_24h_usd (DECIMAL) -- 24-hour VWAP
- volume_24h_usd (DECIMAL) -- 24-hour trading volume
- market_cap_usd (DECIMAL) -- Market capitalization
- price_source (VARCHAR) -- Data source (stellar_dex, coingecko, etc.)
- data_quality (ENUM: excellent, good, fair, poor)
```

#### 3. Cost Basis Reports (`cost_basis_reports`)
Generated tax reports:
```sql
- id (UUID, Primary Key)
- user_address (VARCHAR) -- Beneficiary wallet address
- token_address (VARCHAR) -- Token contract address
- report_year (INTEGER) -- Tax year
- total_vested_amount (DECIMAL) -- Total tokens vested in year
- total_cost_basis_usd (DECIMAL) -- Total cost basis for tax purposes
- total_milestones (INTEGER) -- Number of vesting events
- report_data (JSONB) -- Detailed milestone breakdown
- generated_at (TIMESTAMP) -- Report generation time
```

### Service Architecture

#### 1. Stellar DEX Price Service (`stellarDexPriceService.js`)
- Fetches trades from Stellar Horizon API
- Calculates 24-hour VWAP from trade data
- Supports multiple asset pairings (XLM, USDC)
- Assesses data quality based on volume and trade count
- Handles rate limiting and error recovery

#### 2. Historical Price Tracking Service (`historicalPriceTrackingService.js`)
- Generates vesting milestones for vaults
- Fetches and caches historical prices
- Creates cost basis reports
- Manages price backfilling for existing milestones
- Coordinates between different price sources

#### 3. Automated Job (`historicalPriceTrackingJob.js`)
- Runs daily at 2 AM UTC
- Generates milestones for active vaults
- Backfills missing prices
- Creates cost basis reports for completed years
- Provides job statistics and manual controls

## API Endpoints

### Milestone Management
```http
POST /api/historical-prices/generate-milestones
GET  /api/historical-prices/milestones/:userAddress
```

### Price Data
```http
GET /api/historical-prices/prices/:tokenAddress
POST /api/historical-prices/backfill
```

### Cost Basis Reports
```http
GET /api/historical-prices/cost-basis/:userAddress/:tokenAddress/:year
GET /api/historical-prices/reports/:userAddress
GET /api/historical-prices/reports/:userAddress/:tokenAddress/:year/details
```

### Job Management
```http
POST /api/admin/jobs/historical-prices/start
POST /api/admin/jobs/historical-prices/stop
POST /api/admin/jobs/historical-prices/run
GET  /api/admin/jobs/historical-prices/stats
```

### Health Check
```http
GET /api/historical-prices/health
```

## Usage Examples

### 1. Generate Milestones for a Vault
```javascript
POST /api/historical-prices/generate-milestones
{
  "vaultId": "vault-uuid",
  "incrementDays": 30,
  "forceRefresh": false
}
```

### 2. Get Cost Basis Report
```javascript
GET /api/historical-prices/cost-basis/0x123.../0xABC.../2024

Response:
{
  "success": true,
  "data": {
    "user_address": "0x123...",
    "token_address": "0xABC...",
    "report_year": 2024,
    "total_vested_amount": "1500.0",
    "total_cost_basis_usd": "2250.75",
    "total_milestones": 12,
    "milestones": [
      {
        "date": "2024-03-01T00:00:00Z",
        "milestone_type": "cliff_end",
        "vested_amount": "100.0",
        "price_usd": "1.48",
        "cost_basis_usd": "148.0"
      }
    ],
    "summary": {
      "average_price_usd": "1.50",
      "first_vesting_date": "2024-03-01",
      "last_vesting_date": "2024-12-01"
    }
  }
}
```

### 3. Backfill Missing Prices
```javascript
POST /api/historical-prices/backfill
{
  "tokenAddress": "0xABC...",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "batchSize": 50
}
```

## Price Data Sources

### Primary: Stellar DEX
- **Advantages**: Native to Stellar ecosystem, provides VWAP calculation
- **Data Quality**: Excellent for high-volume tokens, good for medium volume
- **Rate Limits**: Generous, suitable for batch processing

### Fallback: CoinGecko
- **Advantages**: Comprehensive token coverage, reliable historical data
- **Data Quality**: Good for most tokens, fair for low-volume tokens
- **Rate Limits**: 50 calls/minute (free), 500 calls/minute (pro)

### Data Quality Assessment
- **Excellent**: 50+ trades, $10K+ volume
- **Good**: 20+ trades, $1K+ volume  
- **Fair**: 5+ trades, $100+ volume
- **Poor**: <5 trades or <$100 volume

## Automated Processing

### Daily Job Schedule (2 AM UTC)
1. **Milestone Generation**: Process active vaults with recent activity
2. **Price Backfilling**: Fill missing prices for last 30 days
3. **Report Generation**: Create cost basis reports for completed years
4. **Statistics Update**: Track job performance and success rates

### Rate Limiting Strategy
- **Batch Processing**: Process in groups of 5-10 items
- **Delays**: 1-2 second delays between batches
- **Caching**: 5-minute cache for prices, 1-hour cache for token mappings
- **Fallback**: Automatic fallback to alternative price sources

## Error Handling

### Price Fetching Failures
- Automatic fallback to alternative sources
- Graceful degradation with partial data
- Retry logic with exponential backoff
- Error logging and monitoring integration

### Data Validation
- Price reasonableness checks (prevent extreme outliers)
- Volume validation for VWAP calculations
- Date range validation for historical queries
- Token address format validation

### Recovery Mechanisms
- Manual price backfilling endpoints
- Job restart capabilities
- Data consistency checks
- Audit trail maintenance

## Performance Optimizations

### Database Indexing
- Composite indexes on (token_address, date)
- Beneficiary address indexes for quick lookups
- Milestone type and date indexes for reporting
- Unique constraints to prevent duplicates

### Caching Strategy
- **Memory Cache**: 5-minute TTL for frequently accessed prices
- **Database Cache**: Permanent storage of historical prices
- **API Cache**: Respect external API rate limits
- **Report Cache**: Store generated reports for reuse

### Batch Processing
- Process milestones in batches of 50-100
- Parallel processing for independent operations
- Queue-based processing for large datasets
- Progress tracking and resumption capabilities

## Security Considerations

### Data Integrity
- Immutable milestone records once created
- Transaction hash verification for audit trails
- Price source attribution for transparency
- Cryptographic signatures for critical operations

### Access Control
- Admin-only endpoints for job management
- User-specific data access controls
- Rate limiting on public endpoints
- Input validation and sanitization

### Privacy Protection
- No PII storage in price tracking tables
- Encrypted beneficiary email addresses
- Secure token address handling
- GDPR-compliant data retention policies

## Monitoring and Alerting

### Key Metrics
- Daily milestone generation count
- Price fetch success rates
- Report generation completion
- API response times and error rates

### Alert Conditions
- Job failures or extended runtime
- Price fetch failures above threshold
- Data quality degradation
- Database connection issues

### Logging Strategy
- Structured logging with correlation IDs
- Performance metrics for optimization
- Error details for debugging
- Audit logs for compliance

## Testing Strategy

### Unit Tests
- Service method testing with mocked dependencies
- Price calculation accuracy validation
- Error handling and edge cases
- Data model validation

### Integration Tests
- End-to-end API testing
- Database interaction testing
- External API integration testing
- Job execution testing

### Performance Tests
- Load testing for batch operations
- Stress testing for concurrent requests
- Memory usage monitoring
- Database query optimization

## Deployment Considerations

### Environment Variables
```bash
STELLAR_HORIZON_URL=https://horizon.stellar.org
COINGECKO_API_KEY=your_api_key_here
PRICE_API_PROVIDER=stellar_dex
HISTORICAL_PRICE_JOB_ENABLED=true
```

### Database Migration
```bash
# Run the migration to create new tables
npm run migrate

# Verify table creation
npm run db:status
```

### Job Initialization
```bash
# Start the historical price tracking job
curl -X POST http://localhost:4000/api/admin/jobs/historical-prices/start

# Check job status
curl http://localhost:4000/api/admin/jobs/historical-prices/stats
```

## Future Enhancements

### Phase 2 Features
- **Multiple DEX Support**: Integrate additional Stellar DEXs
- **Price Validation**: Cross-reference prices from multiple sources
- **Advanced Analytics**: Volatility analysis and price trends
- **Export Formats**: PDF and Excel export for tax reports

### Phase 3 Features
- **Real-time Updates**: WebSocket-based price streaming
- **Machine Learning**: Price prediction and anomaly detection
- **Integration APIs**: Third-party tax software integration
- **Mobile Support**: Mobile app for tax report access

## Conclusion

This implementation provides a robust, scalable solution for historical price tracking that transforms the Vesting Vault into a professional financial management tool. By automatically tracking prices at vesting milestones and generating comprehensive cost basis reports, it saves users significant time and effort during tax season while ensuring compliance with tax reporting requirements.

The system is designed for reliability, performance, and accuracy, with comprehensive error handling, monitoring, and recovery mechanisms. The modular architecture allows for easy extension and integration with additional price sources and reporting formats as needed.