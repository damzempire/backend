# ROI Analytics Service Documentation

## Overview

The ROI Analytics Service provides comprehensive Return on Investment (ROI) calculations and unrealized gains tracking for token grants and vesting vaults. It tracks token prices at the time of grant versus current market prices via DEX oracles, delivering accurate performance metrics.

## Features

### Core Analytics
- **Grant Price Tracking**: Captures token prices at the exact time of grant allocation
- **Current Market Pricing**: Real-time price data from multiple DEX sources
- **ROI Calculations**: Comprehensive ROI metrics including realized and unrealized gains
- **Multi-Asset Support**: Handles both vault-based and grant stream investments
- **Historical Analysis**: Tracks performance over time with historical price data

### Price Oracle Integration
- **Multiple Sources**: Aggregates data from Stellar DEX, CoinGecko, CoinMarketCap
- **Confidence Scoring**: Provides confidence scores based on data consistency
- **Fallback Mechanisms**: Graceful degradation when sources are unavailable
- **Weighted Averages**: Intelligent price aggregation based on source reliability

### Data Persistence
- **Grant Price Snapshots**: Stores price data at grant time for historical accuracy
- **ROI Calculations**: Persists calculated metrics for trend analysis
- **Performance History**: Tracks ROI changes over time

## Architecture

### Services

#### 1. RoiAnalyticsService (`src/services/roiAnalyticsService.js`)
Main service for ROI calculations and analytics.

**Key Methods:**
- `getUserRoiAnalytics(address)` - Get comprehensive ROI data for a user
- `getVaultRoiAnalytics(address)` - ROI analysis for specific vault
- `getGrantStreamRoiAnalytics(address)` - ROI analysis for grant streams
- `getBatchUserRoiAnalytics(addresses)` - Batch processing for multiple users
- `getMarketOverview()` - Market-wide token price overview

#### 2. DexOracleService (`src/services/dexOracleService.js`)
Price aggregation service with multiple source support.

**Key Methods:**
- `getCurrentPrice(tokenAddress)` - Get current market price with oracle aggregation
- `getHistoricalPrice(tokenAddress, date)` - Get historical price data
- `getOracleHealth()` - Check health of price sources
- `getSupportedSources()` - List available price sources

### Database Models

#### 1. GrantPriceSnapshot (`src/models/grantPriceSnapshot.js`)
Stores price snapshots at grant time.

**Fields:**
- `vault_id` / `grant_stream_id` - Associated investment
- `token_address` - Token contract address
- `grant_amount` - Amount granted
- `grant_price_usd` - Price at grant time
- `price_source` - Source of price data
- `confidence_score` - Data confidence rating

#### 2. RoiCalculation (`src/models/roiCalculation.js`)
Stores calculated ROI metrics.

**Fields:**
- `user_address` / `vault_id` / `grant_stream_id` - Entity being tracked
- `calculation_type` - Type of calculation (user/vault/grant_stream)
- `roi_percentage` - ROI percentage
- `unrealized_gains_usd` - Unrealized gains in USD
- `realized_gains_usd` - Realized gains in USD
- `data_quality` - Quality assessment of calculation

## API Endpoints

### ROI Analytics Endpoints

#### Get User ROI Analytics
```
GET /api/analytics/roi/user/:address
```

**Query Parameters:**
- `include_grants` (boolean, default: true) - Include grant streams
- `include_vaults` (boolean, default: true) - Include vaults
- `cache_bust` (boolean) - Clear cache before request

**Response:**
```json
{
  "success": true,
  "data": {
    "user_address": "GD5DJQD5...",
    "timestamp": "2024-01-15T10:30:00Z",
    "vaults": [...],
    "grant_streams": [...],
    "overall_metrics": {
      "total_investment_usd": 150000,
      "total_current_value_usd": 165000,
      "total_unrealized_gains_usd": 15000,
      "overall_roi_percentage": 10.0,
      "investment_count": 3,
      "profitable_investments": 2,
      "losing_investments": 1
    },
    "summary": "Your investments have gained 10.00% ($15000.00) overall."
  }
}
```

#### Get Vault ROI Analytics
```
GET /api/analytics/roi/vault/:address
```

#### Get Grant Stream ROI Analytics
```
GET /api/analytics/roi/grant/:address
```

#### Batch User ROI Analytics
```
POST /api/analytics/roi/batch
```

**Body:**
```json
{
  "user_addresses": ["USER1", "USER2", "USER3"]
}
```

#### Market Overview
```
GET /api/analytics/market/overview
```

### DEX Oracle Endpoints

#### Get Current Oracle Price
```
GET /api/analytics/oracle/price/:tokenAddress
```

**Query Parameters:**
- `sources` (string, comma-separated) - Specific sources to use
- `min_confidence` (float, default: 0.7) - Minimum confidence threshold
- `cache_bust` (boolean) - Clear cache before request

**Response:**
```json
{
  "success": true,
  "data": {
    "token_address": "TOKEN_ADDRESS",
    "price_usd": 101.25,
    "confidence_score": 0.85,
    "sources": [
      {
        "source": "stellar_dex",
        "price": 101.00,
        "confidence": 0.90,
        "volume": 50000
      }
    ],
    "source_count": 3,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Get Historical Oracle Price
```
GET /api/analytics/oracle/historical/:tokenAddress?date=2023-01-01
```

#### Oracle Health Check
```
GET /api/analytics/oracle/health
```

#### Get Supported Sources
```
GET /api/analytics/oracle/sources
```

### Utility Endpoints

#### Clear Cache
```
POST /api/analytics/cache/clear
```

**Body:**
```json
{
  "service": "roi" | "oracle" | null
}
```

## ROI Calculation Logic

### Metrics Calculated

1. **Investment Value**: `total_allocated * grant_price_usd`
2. **Current Value**: `current_balance * current_price_usd`
3. **Realized Value**: `total_withdrawn * current_price_usd`
4. **Total Value**: `current_value + realized_value`
5. **Unrealized Gains**: `current_value - (current_balance * grant_price_usd)`
6. **Realized Gains**: `realized_value - (total_withdrawn * grant_price_usd)`
7. **ROI Percentage**: `(total_gains / investment_value) * 100`

### Price Change Calculation
- **Price Change**: `current_price_usd - grant_price_usd`
- **Price Change Percentage**: `(price_change / grant_price_usd) * 100`

### Data Quality Assessment
- **Excellent**: High confidence, multiple sources, consistent data
- **Good**: Reliable sources, reasonable consistency
- **Fair**: Limited sources, some inconsistency
- **Poor**: Single source, low confidence, inconsistent data

## Price Oracle Mechanics

### Source Priority and Weighting

1. **Stellar DEX** (Weight: 1.2) - On-chain trading data, highest reliability
2. **CoinMarketCap** (Weight: 1.1) - Premium market data provider
3. **CoinGecko** (Weight: 1.0) - Standard market data
4. **Uniswap V2/V3** (Weight: 1.15) - Major DEX aggregators

### Confidence Score Calculation

The confidence score (0.0 - 1.0) is calculated based on:
- **Price Consistency**: How closely prices match across sources
- **Source Count**: More sources increase confidence
- **Individual Source Confidence**: Each source's reliability rating
- **Volume Data**: Higher trading volumes increase confidence

### Fallback Strategy

1. **Primary**: Stellar DEX (on-chain data)
2. **Secondary**: CoinGecko/CoinMarketCap (market aggregators)
3. **Tertiary**: Historical database lookups
4. **Last Resort**: Current price approximation for historical data

## Usage Examples

### Basic User ROI Analysis
```javascript
const roiAnalytics = require('./services/roiAnalyticsService');

// Get comprehensive ROI for a user
const analytics = await roiAnalytics.getUserRoiAnalytics('GD5DJQD5...');

console.log(`Overall ROI: ${analytics.overall_metrics.overall_roi_percentage}%`);
console.log(`Total Gains: $${analytics.overall_metrics.total_unrealized_gains_usd}`);
```

### Vault-Specific Analysis
```javascript
// Get ROI for a specific vault
const vaultRoi = await roiAnalytics.getVaultRoiAnalytics('VAULT_ADDRESS');

console.log(`Vault ROI: ${vaultRoi.roi_percentage}%`);
console.log(`Unrealized Gains: $${vaultRoi.unrealized_gains_usd}`);
```

### Oracle Price with Custom Sources
```javascript
const dexOracle = require('./services/dexOracleService');

// Get price with specific sources and confidence threshold
const priceData = await dexOracle.getCurrentPrice('TOKEN_ADDRESS', {
  sources: ['stellar_dex', 'coingecko'],
  minConfidence: 0.8
});

console.log(`Price: $${priceData.price_usd}`);
console.log(`Confidence: ${priceData.confidence_score}`);
```

## Configuration

### Environment Variables

```bash
# Price API Configuration
PRICE_API_PROVIDER=coingecko
COINGECKO_API_KEY=your_coingecko_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Stellar Configuration
STELLAR_HORIZON_URL=https://horizon.stellar.org

# Cache Configuration (optional)
ROI_CACHE_TIMEOUT=300000
ORACLE_CACHE_TIMEOUT=60000
```

### Database Setup

The service requires the following tables:
- `grant_price_snapshots`
- `roi_calculations`

These are automatically created by Sequelize models.

## Testing

### Running Tests
```bash
# Run all analytics tests
npm test -- --testPathPattern=roiAnalyticsService

# Run oracle tests
npm test -- --testPathPattern=dexOracleService

# Run with coverage
npm run test:coverage -- --testPathPattern=analytics
```

### Test Coverage

The test suite covers:
- ROI calculation logic
- Price oracle aggregation
- Error handling and fallbacks
- Cache management
- API endpoint responses
- Database interactions

## Performance Considerations

### Caching Strategy
- **ROI Analytics**: 5-minute cache for user calculations
- **Oracle Prices**: 1-minute cache for real-time data
- **Historical Prices**: 1-hour cache for historical data

### Batch Processing
- Use batch endpoints for multiple user requests
- Maximum 50 addresses per batch request
- Parallel processing for improved performance

### Rate Limiting
- Respect external API rate limits
- Implement exponential backoff for failed requests
- Monitor oracle health and source availability

## Monitoring and Health

### Health Checks
- Oracle source availability
- Response time monitoring
- Data quality assessment
- Cache hit rates

### Metrics to Track
- API response times
- Price source availability
- Confidence score distributions
- Error rates by source

## Security Considerations

### Authentication
- All endpoints require authentication
- Admin-only endpoints for health checks and cache management
- Rate limiting to prevent abuse

### Data Privacy
- User addresses are pseudonymous
- No sensitive financial data exposed
- Compliance with data protection regulations

## Troubleshooting

### Common Issues

1. **Low Confidence Scores**
   - Check oracle health endpoint
   - Verify source availability
   - Consider increasing minimum confidence threshold

2. **Missing Historical Data**
   - Verify historical price database is populated
   - Check price service API keys
   - Review fallback mechanisms

3. **Slow Response Times**
   - Clear cache if stale
   - Check network connectivity to price sources
   - Consider reducing source count for faster responses

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=roi-analytics:*
```

## Future Enhancements

### Planned Features
- Real-time WebSocket updates for price changes
- Portfolio rebalancing recommendations
- Advanced analytics (volatility, risk metrics)
- Integration with additional DEX protocols
- Mobile app support

### Extensibility
The service is designed to be easily extended with:
- New price sources
- Additional calculation methods
- Custom metrics and reporting
- Third-party integrations

## Support

For issues, questions, or contributions:
- Check the test suite for expected behavior
- Review the API documentation
- Monitor oracle health status
- Contact the development team for assistance
