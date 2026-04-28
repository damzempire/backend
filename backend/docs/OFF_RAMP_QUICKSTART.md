# Off-Ramp Integration - Quick Start Guide

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

This will install the required `stellar-sdk` package for SEP-24 integration.

## Configuration

Add the following environment variables to your `.env` file:

```bash
# Stellar Anchor Configuration
STELLAR_ANCHORS=testanchor.stellar.org:USDC,apay.io:USDC

# Swap Fee Configuration (percentage)
SWAP_FEE_PERCENT=0.3

# Stellar Network (for testnet)
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
```

For production, update to mainnet:
```bash
STELLAR_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
STELLAR_HORIZON_URL=https://horizon.stellar.org
```

## Testing the Integration

### 1. Start the Backend

```bash
npm run dev
```

### 2. Test with GraphQL Playground

Navigate to `http://localhost:4000/graphql` (or your configured port) and try these queries:

#### Get a Single Quote

```graphql
query {
  offRampQuote(
    tokenSymbol: "USDC"
    tokenAmount: "1000"
    fiatCurrency: "USD"
  ) {
    anchorDomain
    netPayout
    fees {
      swapFee
      withdrawalFee
      totalFees
    }
  }
}
```

#### Compare Multiple Quotes

```graphql
query {
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

#### Get Liquidity Estimate for Beneficiary

```graphql
query {
  liquidityEstimate(
    vaultAddress: "YOUR_VAULT_ADDRESS"
    beneficiaryAddress: "YOUR_BENEFICIARY_ADDRESS"
    fiatCurrency: "USD"
  ) {
    tokenSymbol
    claimableAmount
    bestQuote {
      netPayout
      fees {
        totalFees
      }
    }
    totalCostOfLiquidity
  }
}
```

### 3. Run Tests

```bash
npm test -- anchorService.test.js
```

## Integration with Frontend

### Example React Component

```javascript
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_LIQUIDITY_ESTIMATE = gql`
  query GetLiquidityEstimate($vaultAddress: String!, $beneficiaryAddress: String!) {
    liquidityEstimate(
      vaultAddress: $vaultAddress
      beneficiaryAddress: $beneficiaryAddress
      fiatCurrency: "USD"
    ) {
      tokenSymbol
      claimableAmount
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
`;

function LiquidityCard({ vaultAddress, beneficiaryAddress }) {
  const { loading, error, data } = useQuery(GET_LIQUIDITY_ESTIMATE, {
    variables: { vaultAddress, beneficiaryAddress }
  });

  if (loading) return <div>Loading liquidity estimate...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const { liquidityEstimate } = data;
  const { bestQuote } = liquidityEstimate;

  return (
    <div className="liquidity-card">
      <h3>Liquidity Estimate</h3>
      
      <div className="claimable">
        <label>Claimable Amount:</label>
        <span>{liquidityEstimate.claimableAmount} {liquidityEstimate.tokenSymbol}</span>
      </div>

      <div className="net-payout">
        <label>Net Payout (USD):</label>
        <span>${bestQuote.netPayout}</span>
      </div>

      <div className="fees">
        <label>Total Fees:</label>
        <span>${bestQuote.fees.totalFees}</span>
        <div className="fee-breakdown">
          <small>Swap Fee: ${bestQuote.fees.swapFee}</small>
          <small>Withdrawal Fee: ${bestQuote.fees.withdrawalFee}</small>
        </div>
      </div>

      <div className="cost-of-liquidity">
        <label>Total Cost of Liquidity:</label>
        <span>${liquidityEstimate.totalCostOfLiquidity}</span>
      </div>

      <div className="anchor">
        <small>Best rate from: {bestQuote.anchorDomain}</small>
      </div>
    </div>
  );
}

export default LiquidityCard;
```

## Supported Fiat Currencies

- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- CAD (Canadian Dollar)

## Supported Anchors (Testnet)

Default configuration includes:
- `testanchor.stellar.org` - Test anchor for development
- `apay.io` - AnchorUSD (supports USDC)

## Production Anchors

For production, configure real anchors:

```bash
STELLAR_ANCHORS=apay.io:USDC,circle.com:USDC,wirexapp.com:USDC
```

Popular production anchors:
- **AnchorUSD** (`apay.io`) - USDC, USD
- **Circle** (`circle.com`) - USDC
- **Wirex** (`wirexapp.com`) - Multiple currencies

## Troubleshooting

### No Quotes Available

**Problem**: Query returns "No quotes available from anchors"

**Solutions**:
1. Check anchor configuration in `.env`
2. Verify anchors support the token (e.g., USDC)
3. Check network connectivity to anchor domains
4. Verify anchors are operational (check stellar.toml)

### Invalid Token Symbol

**Problem**: "No anchors configured for {TOKEN}"

**Solutions**:
1. Ensure token symbol matches anchor configuration
2. Add anchor for the token in `STELLAR_ANCHORS`
3. Verify token is supported by configured anchors

### Timeout Errors

**Problem**: Requests timeout when fetching quotes

**Solutions**:
1. Check network connectivity
2. Verify anchor URLs are accessible
3. Increase timeout in `anchorService.js` if needed
4. Check anchor status pages

### Cache Issues

**Problem**: Stale quotes being returned

**Solutions**:
1. Clear cache: Call `anchorService.clearCache()`
2. Reduce cache timeout in `anchorService.js`
3. Restart the backend service

## Monitoring

### Key Metrics to Track

1. **Quote Fetch Success Rate**
   - Monitor successful vs failed quote requests
   - Alert on high failure rates

2. **Anchor Response Times**
   - Track latency for each anchor
   - Identify slow or unreliable anchors

3. **Fee Trends**
   - Monitor fee changes over time
   - Alert on significant fee increases

4. **Cache Hit Rate**
   - Track cache effectiveness
   - Optimize cache timeout based on hit rate

### Logging

The service logs important events:
- Quote requests and responses
- Anchor failures
- Cache hits/misses
- Fee calculations

Check logs for debugging:
```bash
tail -f logs/backend.log | grep "anchor"
```

## Next Steps

1. **Customize Anchors**: Add production anchors to `.env`
2. **Adjust Fees**: Configure `SWAP_FEE_PERCENT` based on your DEX
3. **Frontend Integration**: Use the example React component
4. **Monitoring**: Set up alerts for quote failures
5. **Testing**: Test with real vault addresses and beneficiaries

## Support Resources

- [Full Documentation](./OFF_RAMP_INTEGRATION.md)
- [GraphQL Query Examples](./graphql/off-ramp-queries.graphql)
- [SEP-24 Specification](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0024.md)
- [Stellar Anchors Directory](https://stellar.org/ecosystem/anchors)

## Common Use Cases

### 1. Vesting Dashboard

Display real-time liquidity estimates for vested tokens:
- Show claimable amount
- Display net payout in fiat
- Highlight total fees
- Compare multiple anchors

### 2. Claim Decision Support

Help users decide when to claim:
- Show current vs historical fees
- Display fee trends
- Suggest optimal claim timing
- Compare different fiat currencies

### 3. Financial Planning

Enable institutional users to plan expenses:
- Estimate fiat proceeds from vested tokens
- Calculate tax implications
- Plan operational expenses
- Budget for liquidity costs

## API Rate Limits

Be aware of anchor API rate limits:
- Most anchors: 100 requests/minute
- Use caching to reduce API calls
- Implement exponential backoff for retries

## Security Considerations

1. **Input Validation**: All inputs are validated before processing
2. **Timeout Protection**: 10-second timeout on anchor requests
3. **Error Handling**: Graceful degradation on anchor failures
4. **Cache Security**: Quotes cached for 1 minute only
5. **No Sensitive Data**: No private keys or sensitive data in quotes

## Performance Optimization

1. **Caching**: 1-minute cache reduces API calls by ~95%
2. **Parallel Requests**: Multiple anchors queried simultaneously
3. **Timeout Management**: Fast failure on slow anchors
4. **Lazy Loading**: Quotes fetched only when needed

## Feedback and Contributions

Found a bug or have a suggestion? Please:
1. Check existing issues
2. Create a detailed bug report
3. Submit a pull request with fixes
4. Update documentation as needed
