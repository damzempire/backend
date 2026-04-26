# Multi-Currency Path Payment Analytics

This document describes the implementation of the Multi-Currency Path Payment Analytics feature for the Vesting-Vault backend. This system tracks Stellar DEX path payments, records exchange rates at the exact moment of claim-and-swap operations, and provides accurate cost basis data for tax reporting.

## Overview

The Multi-Currency Path Payment Analytics system addresses the critical need for accurate capital gains tracking when beneficiaries claim tokens and instantly swap them for USDC or other assets. By monitoring Stellar DEX path payments in real-time, the system captures the exact exchange rates at the moment of conversion, ensuring users don't overpay or underpay their taxes due to price volatility.

## Architecture

### Core Components

1. **ConversionEvent Model** - Database model for tracking all conversion events
2. **StellarPathPaymentListener** - Real-time listener for Stellar DEX path payments
3. **PathPaymentAnalyticsService** - Analytics and reporting service
4. **API Endpoints** - RESTful API for accessing conversion data and reports

### Data Flow

```
Stellar Network → Path Payment Listener → Conversion Events → Analytics Service → API → Frontend
                      ↓
                Claims History ← Cost Basis Reports
```

## Database Schema

### ConversionEvent Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| transaction_hash | STRING | Stellar transaction hash (unique) |
| user_address | STRING | Beneficiary wallet address |
| claim_id | UUID | Associated claim history ID (optional) |
| source_asset_code | STRING | Source asset code (e.g., "TOKEN", "XLM") |
| source_asset_issuer | STRING | Source asset issuer address |
| source_amount | DECIMAL(36,18) | Amount of source asset sent |
| destination_asset_code | STRING | Destination asset code (e.g., "USDC") |
| destination_asset_issuer | STRING | Destination asset issuer address |
| destination_amount | DECIMAL(36,18) | Amount of destination asset received |
| exchange_rate | DECIMAL(36,18) | Exchange rate (dest/src) |
| exchange_rate_usd | DECIMAL(36,18) | Exchange rate in USD terms |
| path_assets | JSON | Intermediate assets in path payment |
| slippage_percentage | DECIMAL(10,6) | Slippage from quoted price |
| gas_fee_xlm | DECIMAL(36,18) | Gas fee paid in XLM |
| block_number | BIGINT | Stellar ledger sequence |
| transaction_timestamp | DATE | Transaction timestamp |
| conversion_type | ENUM | Type: claim_and_swap, direct_swap, arbitrage |
| price_source | STRING | Price data source |
| data_quality | ENUM | Data quality: excellent, good, fair, poor |

### ClaimsHistory Updates

Added `conversion_event_id` field to link claims with subsequent swaps.

## API Endpoints

### User Conversion Events

```
GET /api/conversions/user/{userAddress}
```

Query Parameters:
- `startDate` (ISO8601): Start date filter
- `endDate` (ISO8601): End date filter  
- `conversionType` (ENUM): Filter by conversion type
- `assetPair` (STRING): Filter by asset pair (e.g., "TOKEN/USDC")
- `limit` (INT): Pagination limit (max 1000)
- `offset` (INT): Pagination offset
- `orderBy` (STRING): Sort field
- `orderDirection` (STRING): Sort direction (ASC/DESC)

Response:
```json
{
  "success": true,
  "data": {
    "userAddress": "GD5XQ...",
    "period": { "start": "2024-01-01", "end": "2024-12-31" },
    "events": [...],
    "pagination": {
      "total": 42,
      "limit": 100,
      "offset": 0,
      "hasMore": false
    }
  }
}
```

### User Analytics Summary

```
GET /api/conversions/user/{userAddress}/analytics
```

Query Parameters:
- `timeRange` (ENUM): 1H, 24H, 7D, 1M, 3M, 6M, 1Y

Response:
```json
{
  "success": true,
  "data": {
    "summary": [...],
    "topAssetPairs": [...],
    "monthlyTrends": [...],
    "timeRange": "1Y",
    "period": { "start": "...", "end": "..." }
  }
}
```

### Cost Basis Report Generation

```
POST /api/conversions/cost-basis/{userAddress}/{taxYear}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_address": "GD5X...",
    "report_year": 2024,
    "total_vested_amount": "1500.000000",
    "total_cost_basis_usd": "750.000000",
    "total_milestones": 2,
    "report_data": {
      "detailedBreakdown": [...]
    }
  }
}
```

### Exchange Rate Analytics

```
GET /api/conversions/exchange-rates/{sourceAsset}/{destinationAsset}
```

Query Parameters:
- `timeRange` (ENUM): Time range for analysis
- `sourceIssuer` (STRING): Source asset issuer (optional)
- `destinationIssuer` (STRING): Destination asset issuer (optional)

### System Statistics (Admin)

```
GET /api/conversions/system-stats
```

### Listener Management (Admin)

```
GET /api/conversions/listener/status
POST /api/conversions/listener/start
POST /api/conversions/listener/stop
```

## Implementation Details

### Path Payment Detection

The system monitors Stellar transactions for path payment operations:
- `path_payment_strict_send` - Send exact source amount
- `path_payment_strict_receive` - Receive exact destination amount

### Claim-and-Swap Detection

When a path payment is detected, the system:
1. Checks for recent claims (within 10 minutes) from the same user
2. Associates the conversion with the claim if found
3. Marks as `claim_and_swap` type for tax reporting

### Exchange Rate Calculation

For each conversion:
- Basic rate: `destination_amount / source_amount`
- USD rate: Determined based on asset pair
  - USDC destination: Direct rate
  - USDC source: Inverse rate
  - Other pairs: External price oracle (placeholder)

### Data Quality Assessment

Quality is assessed based on transaction volume:
- `excellent`: ≥ 100,000 units
- `good`: ≥ 10,000 units
- `fair`: ≥ 1,000 units
- `poor`: < 1,000 units

## Configuration

### Environment Variables

```bash
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_NETWORK=public
```

### Database Migration

Run the migration to create the new tables:

```bash
npm run migrate
```

Or manually:

```bash
npx sequelize-cli db:migrate --migrations-path ./migrations
```

## Testing

### Unit Tests

Run the comprehensive test suite:

```bash
npm test -- pathPaymentAnalyticsService.test.js
npm test -- stellarPathPaymentListener.test.js
```

### Integration Tests

Test the API endpoints:

```bash
npm test -- test-conversion-analytics.js
```

### Mock Data

For testing, the system includes comprehensive mocks for:
- Stellar SDK Server class
- Transaction streams
- Database operations

## Cost Basis Calculation

### Claim-and-Swap Events

For claim-and-swap conversions:
1. **Vested Amount**: Amount from the original claim
2. **Cost Basis**: USD value at conversion time
   - Primary: `vested_amount × exchange_rate_usd`
   - Fallback: `destination_amount` (if USDC)
   - Last resort: `claim.price_at_claim_usd`

### Direct Swaps

For direct swaps without claims:
1. **Vested Amount**: Source amount
2. **Cost Basis**: USD value using exchange rate

### Tax Reporting

The system generates annual cost basis reports including:
- Total vested amount for the year
- Total cost basis in USD
- Detailed breakdown of each conversion
- Supporting data (exchange rates, timestamps, gas fees)

## Performance Considerations

### Database Indexing

Optimized indexes for:
- Transaction hash lookups (unique)
- User address queries
- Time-based queries
- Asset pair queries
- Block number queries

### Caching

- Exchange rate data cached for 5 minutes
- User analytics cached per session
- System stats cached for 1 minute

### Rate Limiting

- API endpoints inherit global rate limiting
- Additional wallet-based rate limiting applied
- Listener includes exponential backoff on errors

## Monitoring and Alerting

### Health Checks

```
GET /api/conversions/health
```

Returns listener status and system health.

### Error Handling

- Database errors logged with context
- Stellar API errors handled with retries
- Failed conversions marked but don't stop processing

### Metrics

Track:
- Conversion events processed per minute
- Average processing latency
- Error rates by type
- Database query performance

## Security Considerations

### Data Privacy

- All user addresses are public blockchain addresses
- No sensitive personal information stored
- Conversion data is financial but public on-chain

### Access Control

- User endpoints require authentication
- Admin endpoints require additional permissions
- Rate limiting prevents abuse

### Audit Trail

- All conversion events immutable
- Full transaction history preserved
- Cost basis reports timestamped and versioned

## Troubleshooting

### Common Issues

1. **Listener Not Starting**
   - Check Stellar network connectivity
   - Verify database permissions
   - Check environment variables

2. **Missing Conversions**
   - Verify transaction was successful
   - Check if transaction contains path payment operations
   - Review listener logs for processing errors

3. **Incorrect Cost Basis**
   - Verify exchange rate calculation logic
   - Check USD rate fallback mechanisms
   - Review claim association timing

### Debug Mode

Enable debug logging:

```bash
DEBUG=stellar:* npm run dev
```

### Manual Data Repair

For data inconsistencies, use admin endpoints:
- Recalculate cost basis reports
- Reprocess specific transactions
- Update exchange rates manually

## Future Enhancements

### Planned Features

1. **Real-time Price Feeds**: Integration with multiple price oracles
2. **Advanced Analytics**: Volatility analysis, trend detection
3. **Multi-chain Support**: Extend beyond Stellar network
4. **Tax Optimization**: Automated tax loss harvesting suggestions
5. **Portfolio Integration**: Full portfolio tracking and reporting

### Scalability Improvements

1. **Horizontal Scaling**: Multiple listener instances
2. **Event Streaming**: Kafka/Redis for real-time processing
3. **Data Warehousing**: Long-term analytics storage
4. **API Caching**: Redis-based response caching

## Contributing

When contributing to this system:

1. Write comprehensive tests for new features
2. Update documentation for API changes
3. Consider tax implications of any modifications
4. Test with mainnet data before production deployment
5. Follow existing code style and patterns

## License

This feature is part of the Vesting-Vault backend project and follows the same licensing terms.
