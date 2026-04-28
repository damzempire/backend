# Off-Ramp Integration Guide

## Overview

The off-ramp integration provides real-time fiat conversion quotes from Stellar anchors using SEP-24 (Hosted Deposit and Withdrawal). This enables institutional users to estimate the net payout when converting vested tokens to fiat currencies (USD, EUR, GBP, CAD).

## Architecture

### Components

1. **AnchorService** (`backend/src/services/anchorService.js`)
   - Integrates with Stellar anchors via SEP-24
   - Fetches real-time quotes with fee breakdowns
   - Caches quotes for 1 minute to reduce API calls
   - Supports multiple anchors for best rate comparison

2. **AnchorResolver** (`backend/src/graphql/resolvers/anchorResolver.js`)
   - GraphQL resolver for off-ramp queries
   - Calculates liquidity estimates for beneficiaries
   - Integrates with vault and claim calculation services

3. **GraphQL Schema Extensions** (`backend/src/graphql/schema.js`)
   - New types: `OffRampQuote`, `QuoteFees`, `LiquidityEstimate`
   - New queries: `offRampQuote`, `offRampQuotes`, `liquidityEstimate`

## Features

### 1. Single Quote Retrieval

Get the best available quote from configured anchors:

```graphql
query GetOffRampQuote {
  offRampQuote(
    tokenSymbol: "USDC"
    tokenAmount: "1000"
    fiatCurrency: "USD"
  ) {
    anchorDomain
    assetCode
    inputAmount
    fiatCurrency
    exchangeRate
    grossAmount
    fees {
      swapFee
      swapFeePercent
      withdrawalFee
      withdrawalFeeType
      totalFees
    }
    netPayout
    estimatedTime
    minAmount
    maxAmount
    timestamp
  }
}
```

### 2. Multiple Quote Comparison

Compare quotes from all available anchors:

```graphql
query CompareQuotes {
  offRampQuotes(
    tokenSymbol: "USDC"
    tokenAmount: "1000"
    fiatCurrency: "USD"
  ) {
    anchorDomain
    netPayout
    fees {
      totalFees
    }
  }
}
```

### 3. Liquidity Estimate for Beneficiaries

Get complete liquidity estimate including claimable amount and best quote:

```graphql
query GetLiquidityEstimate {
  liquidityEstimate(
    vaultAddress: "GXXXXXX..."
    beneficiaryAddress: "GXXXXXX..."
    fiatCurrency: "USD"
  ) {
    tokenSymbol
    claimableAmount
    quotes {
      anchorDomain
      netPayout
      fees {
        totalFees
      }
    }
    bestQuote {
      anchorDomain
      netPayout
      fees {
        swapFee
        withdrawalFee
        totalFees
      }
    }
    totalCostOfLiquidity
  }
}
```

## Configuration

### Environment Variables

```bash
# Stellar Anchors (comma-separated: domain:asset)
STELLAR_ANCHORS=testanchor.stellar.org:USDC,apay.io:USDC

# Swap Fee Percentage (default: 0.3%)
SWAP_FEE_PERCENT=0.3

# Stellar Network
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

### Default Anchors

If `STELLAR_ANCHORS` is not configured, the service uses:
- `testanchor.stellar.org` for USDC
- `apay.io` for USDC

## Fee Calculation

### Total Cost of Liquidity

The service calculates the complete cost breakdown:

1. **Swap Fee**: Token-to-stablecoin conversion fee (configurable, default 0.3%)
2. **Withdrawal Fee**: Anchor's fee for fiat withdrawal (from SEP-24 info)
   - Can be fixed amount or percentage
3. **Total Fees**: Sum of swap fee and withdrawal fee
4. **Net Payout**: Gross amount minus total fees

### Formula

```
Gross Amount = Token Amount × Exchange Rate
Net Payout = Gross Amount - (Swap Fee + Withdrawal Fee)
Total Cost of Liquidity = Gross Amount - Net Payout
```

## SEP-24 Integration Flow

1. **Resolve Anchor TOML**
   - Fetch `stellar.toml` from anchor domain
   - Extract `TRANSFER_SERVER_SEP0024` endpoint

2. **Get Anchor Info**
   - Call `/info` endpoint
   - Verify withdrawal is enabled for asset
   - Extract fee structure and limits

3. **Get Exchange Rate**
   - Attempt to fetch from `/price` endpoint (SEP-38)
   - Fallback to 1:1 for stablecoins to USD

4. **Calculate Quote**
   - Apply swap fee
   - Apply withdrawal fee
   - Calculate net payout

5. **Return Quote**
   - Include all fee breakdowns
   - Provide estimated time
   - Include min/max limits

## Error Handling

The service handles various error scenarios:

- **Invalid Parameters**: Validates token symbol, amount, and fiat currency
- **Anchor Unavailable**: Falls back to other anchors if one fails
- **No Quotes Available**: Returns error if no anchors can provide quotes
- **Network Errors**: Implements timeouts (10 seconds) for anchor requests
- **Cache Failures**: Gracefully degrades if cache is unavailable

## Caching Strategy

- **Quote Cache**: 1 minute TTL
- **Cache Key**: `{tokenSymbol}-{tokenAmount}-{fiatCurrency}-{anchorDomain}`
- **Cache Invalidation**: Manual via `clearCache()` method

## Testing

Run the test suite:

```bash
npm test -- anchorService.test.js
```

Test coverage includes:
- Quote retrieval with valid parameters
- Multiple quote comparison
- Fee calculation (fixed and percentage)
- Input validation
- Caching behavior
- Error handling

## Integration with Vesting Dashboard

### Frontend Usage

```javascript
// Get liquidity estimate for current user
const { data } = await apolloClient.query({
  query: GET_LIQUIDITY_ESTIMATE,
  variables: {
    vaultAddress: vault.address,
    beneficiaryAddress: user.address,
    fiatCurrency: 'USD'
  }
});

// Display in dashboard
console.log(`Claimable: ${data.liquidityEstimate.claimableAmount} ${data.liquidityEstimate.tokenSymbol}`);
console.log(`Net Payout: $${data.liquidityEstimate.bestQuote.netPayout}`);
console.log(`Total Cost: $${data.liquidityEstimate.totalCostOfLiquidity}`);
```

### Dashboard Components

1. **Claimable Amount Card**
   - Show token amount available to claim
   - Display estimated USD value

2. **Off-Ramp Quote Card**
   - Show best quote from anchors
   - Display fee breakdown
   - Show net payout amount

3. **Cost of Liquidity Indicator**
   - Highlight total fees
   - Show percentage of gross amount
   - Provide comparison across anchors

## Production Considerations

### Anchor Selection

- Configure production anchors in `STELLAR_ANCHORS`
- Consider anchor reliability and uptime
- Monitor anchor fee changes
- Implement anchor health checks

### Rate Limiting

- Respect anchor API rate limits
- Implement exponential backoff for retries
- Use caching to reduce API calls

### Security

- Validate all anchor responses
- Sanitize user inputs
- Implement request timeouts
- Log suspicious activity

### Monitoring

- Track quote fetch success rates
- Monitor anchor response times
- Alert on quote failures
- Track fee trends over time

## Future Enhancements

1. **SEP-38 Full Integration**
   - Support for more complex quote requests
   - Firm quotes with expiration times

2. **Additional Anchors**
   - Support for more Stellar anchors
   - Dynamic anchor discovery

3. **Historical Data**
   - Track quote history
   - Analyze fee trends
   - Optimize anchor selection

4. **Automated Execution**
   - Initiate SEP-24 withdrawal flow
   - Track withdrawal status
   - Handle KYC requirements

## Support

For issues or questions:
- Check anchor documentation: https://stellar.org/developers/docs/anchoring-assets
- Review SEP-24 specification: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md
- Contact anchor support for anchor-specific issues

## References

- [SEP-24: Hosted Deposit and Withdrawal](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
- [SEP-38: Anchor RFQ API](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0038.md)
- [Stellar Anchors](https://stellar.org/developers/docs/anchoring-assets)
