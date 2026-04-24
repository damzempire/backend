# Historical Price Tracking Implementation

This document describes the implementation of historical price tracking for calculating realized gains in the Vesting Vault system.

## Overview

The system now tracks token prices at the moment of each claim to enable accurate "Realized Gains" calculations for tax reporting purposes.

## Architecture

### Database Schema

The `claims_history` table now includes:
- `price_at_claim_usd` (DECIMAL(36,18)): Token price in USD at the time of claim

### Components

1. **Claims History Model** (`src/models/claimsHistory.js`)
   - Sequelize model for the claims_history table
   - Includes the new `price_at_claim_usd` column
   - Properly indexed for performance

2. **Price Service** (`src/services/priceService.js`)
   - Fetches token prices from CoinGecko API
   - Supports both current and historical prices
   - Includes caching to avoid rate limits
   - Handles ERC-20 token address to CoinGecko ID mapping

3. **Indexing Service** (`src/services/indexingService.js`)
   - Processes individual and batch claims
   - Automatically fetches prices during claim processing
   - Provides backfill functionality for existing claims
   - Calculates realized gains for tax reporting

4. **API Endpoints** (`src/index.js`)
   - `POST /api/claims` - Process single claim
   - `POST /api/claims/batch` - Process multiple claims
   - `POST /api/claims/backfill-prices` - Backfill missing prices
   - `GET /api/claims/:userAddress/realized-gains` - Calculate realized gains

## Usage

### Processing a New Claim

```javascript
const claimData = {
  user_address: '0x1234...',
  token_address: '0xA0b8...',
  amount_claimed: '100.5',
  claim_timestamp: '2024-01-15T10:30:00Z',
  transaction_hash: '0xabc...',
  block_number: 18500000
};

// The price_at_claim_usd will be automatically fetched and populated
const claim = await indexingService.processClaim(claimData);
```

### Calculating Realized Gains

```javascript
const gains = await indexingService.getRealizedGains(
  '0x1234...',  // user address
  new Date('2024-01-01'),  // start date (optional)
  new Date('2024-12-31')   // end date (optional)
);

// Returns:
// {
//   user_address: '0x1234...',
//   total_realized_gains_usd: 15075.50,
//   claims_processed: 5,
//   period: { start_date: ..., end_date: ... }
// }
```

### Backfilling Missing Prices

```javascript
// Process existing claims without price data
const processedCount = await indexingService.backfillMissingPrices();
```

## API Examples

### Process Single Claim
```bash
curl -X POST http://localhost:3000/api/claims \
  -H "Content-Type: application/json" \
  -d '{
    "user_address": "0x1234567890123456789012345678901234567890",
    "token_address": "0xA0b86a33E6441e6c8d0A1c9c8c8d8d8d8d8d8d8d",
    "amount_claimed": "100.5",
    "claim_timestamp": "2024-01-15T10:30:00Z",
    "transaction_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "block_number": 18500000
  }'
```

### Get Realized Gains
```bash
curl "http://localhost:3000/api/claims/0x1234567890123456789012345678901234567890/realized-gains?startDate=2024-01-01&endDate=2024-12-31"
```

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Start the database and application:
```bash
docker-compose up -d
```

3. Run tests:
```bash
npm test
```

## Testing

Run the comprehensive test suite:
```bash
node test/historicalPriceTracking.test.js
```

The test suite covers:
- Health checks
- Single claim processing
- Batch claim processing
- Realized gains calculation
- Price backfilling

## Rate Limiting

The CoinGecko API has rate limits. The implementation includes:
- 1-minute cache for price data
- 1-hour cache for token ID mappings
- Batch processing to minimize API calls
- Error handling for rate limit scenarios

## Error Handling

The system gracefully handles:
- Missing token prices
- API rate limits
- Invalid token addresses
- Network failures
- Database connection issues

## Future Enhancements

1. **Multiple Price Sources**: Add support for alternative price APIs
2. **Price Validation**: Cross-reference prices from multiple sources
3. **Historical Data Caching**: Store historical prices locally
4. **Automated Backfill**: Scheduled jobs for price backfilling
5. **Tax Report Generation**: Generate comprehensive tax reports

## Compliance

This implementation supports tax compliance by:
- Providing accurate USD values at claim time
- Maintaining immutable historical records
- Supporting audit trails through transaction hashes
- Enabling precise realized gains calculations
