# TVL-Price Correlation Analysis

This feature provides quantitative evidence that using JerryIdoko's vesting vault is not just a "Storage Choice" but a "Strategic Price Stability Choice." It analyzes the relationship between Total Value Locked (TVL) in vaults and price volatility from the Stellar DEX.

## Overview

The correlation analysis tool joins historical TVL data from vaults with price data from the Stellar DEX to provide insights into how token locking affects price stability. This serves as a powerful marketing tool to demonstrate the value proposition of the Vesting-Vault protocol to future project founders.

## Features

### Core Analysis Capabilities

- **Pearson Correlation**: Measures linear correlation between TVL changes and price changes
- **Spearman Correlation**: Measures monotonic correlation (rank-based)
- **Volatility Analysis**: Calculates price and TVL volatility metrics
- **Marketing Insights**: Generates actionable insights for marketing campaigns

### Data Visualization

- Correlation charts showing TVL vs price movements
- Time-series analysis of both metrics
- Interactive data for marketing presentations

### API Endpoints

- `/api/correlation/analysis` - Full correlation analysis
- `/api/correlation/chart` - Chart-ready data
- `/api/correlation/insights` - Marketing-focused insights
- `/api/correlation/historical-tvl` - Historical TVL data

## Architecture

### Data Models

#### HistoricalTVL
- Tracks daily TVL snapshots
- Stores 24h change metrics
- Includes data quality ratings
- Optimized for time-series queries

#### HistoricalTokenPrice (existing)
- Daily price data from Stellar DEX
- Multiple price sources supported
- Volume and market cap data

### Services

#### TVLPriceCorrelationService
- Core correlation calculations
- Data alignment and processing
- Marketing insight generation
- Caching for performance

#### Enhanced TVLService
- Automatic historical snapshots
- Change calculations
- Integration with correlation analysis

## API Documentation

### GET /api/correlation/analysis

Performs full correlation analysis for a specified date range.

**Query Parameters:**
- `tokenAddress` (optional): Specific token to analyze
- `startDate` (optional): Start date (YYYY-MM-DD, default: 90 days ago)
- `endDate` (optional): End date (YYYY-MM-DD, default: today)
- `correlationType` (optional): 'pearson' or 'spearman' (default: 'pearson')

**Response:**
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2023-01-01",
      "endDate": "2023-03-31",
      "dataPoints": 90
    },
    "correlations": {
      "pearson": -0.45,
      "spearman": -0.52,
      "interpretation": "Moderate"
    },
    "volatility": {
      "price": 0.034,
      "tvl": 0.156,
      "priceVolatilityPercent": 3.4,
      "tvlVolatilityPercent": 15.6
    },
    "insights": [
      {
        "type": "price_stability",
        "title": "TVL Increases Reduce Price Volatility",
        "description": "Analysis shows a moderate negative correlation...",
        "impact": "high",
        "marketingAngle": "Strategic Price Stability Choice"
      }
    ]
  }
}
```

### GET /api/correlation/chart

Returns chart-ready data for visualization.

**Response:**
```json
{
  "success": true,
  "data": {
    "chartData": {
      "dates": ["2023-01-01", "2023-01-02", ...],
      "tvlChanges": [2.5, -1.2, 3.1, ...],
      "priceChanges": [-0.8, 0.3, -1.1, ...],
      "tvls": [1000000, 1025000, 1012500, ...],
      "prices": [1.00, 0.99, 1.01, ...]
    },
    "correlation": { ... },
    "insights": [ ... ],
    "summary": {
      "totalDataPoints": 90,
      "correlationStrength": "Moderate",
      "primaryInsight": "TVL Increases Reduce Price Volatility"
    }
  }
}
```

### GET /api/correlation/insights

Returns marketing-focused insights.

**Response:**
```json
{
  "success": true,
  "data": {
    "marketingSummary": {
      "primaryAngle": "Strategic Price Stability Choice",
      "keyFinding": "TVL Increases Reduce Price Volatility",
      "evidence": "Analysis shows a moderate negative correlation...",
      "correlationStrength": "Moderate",
      "dataPoints": 90
    }
  }
}
```

## Marketing Use Cases

### 1. Quantitative Evidence for Sales

The correlation analysis provides concrete data showing that:
- Higher TVL correlates with lower price volatility
- Vesting mechanisms contribute to price stability
- JerryIdoko's vault provides measurable market benefits

### 2. Investor Presentations

Use the chart data to create compelling visualizations:
- Show inverse correlation between TVL growth and price swings
- Demonstrate long-term stability benefits
- Compare with projects without vesting mechanisms

### 3. Content Marketing

Generate blog posts and whitepapers with:
- Data-driven insights about token economics
- Case studies using historical correlation data
- Comparative analysis with other stabilization methods

## Implementation Details

### Correlation Calculations

#### Pearson Correlation
Measures the linear relationship between two variables:
- Range: -1 to 1
- 1: Perfect positive correlation
- -1: Perfect negative correlation
- 0: No correlation

#### Spearman Correlation
Measures the monotonic relationship using rank correlation:
- Less sensitive to outliers
- Good for non-linear relationships
- Same range as Pearson

### Volatility Metrics

Price volatility is calculated as the standard deviation of daily returns:
```
volatility = sqrt(variance(daily_returns))
```

This provides a normalized measure of price stability.

### Data Alignment

TVL and price data are aligned by date to ensure accurate correlation analysis:
- Only common dates are included
- Missing data points are excluded
- Changes are calculated as percentage differences

## Performance Considerations

### Caching

- Analysis results are cached for 5 minutes
- Cache key includes all query parameters
- Admin endpoint available to clear cache

### Database Optimization

- Indexes on date columns for fast queries
- Composite indexes for common query patterns
- Efficient pagination for large date ranges

### Data Quality

- Quality ratings for TVL snapshots
- Automatic data validation
- Graceful handling of missing data

## Setup and Configuration

### Database Migration

Run the migration to create the historical_tvl table:
```sql
-- File: migrations/014_create_historical_tvl_table.sql
```

### Environment Variables

No additional environment variables required for basic functionality.

### Scheduled Jobs

Set up a cron job to create daily TVL snapshots:
```bash
0 1 * * * curl -X POST http://localhost:4000/api/correlation/create-snapshot
```

## Testing

### Unit Tests

Run the correlation service tests:
```bash
npm test -- tvlPriceCorrelationService.test.js
```

### Integration Tests

Test the full API workflow:
```bash
npm test -- correlationRoutes.test.js
```

### Test Data

Use the test endpoints to generate sample data:
```bash
curl -X POST http://localhost:4000/api/correlation/create-snapshot
```

## Future Enhancements

### Planned Features

1. **Multi-Token Analysis**: Correlate TVL with multiple tokens simultaneously
2. **Real-time Analysis**: WebSocket updates for live correlation monitoring
3. **Predictive Analytics**: Machine learning models to predict price impact
4. **Comparative Analysis**: Compare with external projects' data
5. **Advanced Visualizations**: Interactive charts with drill-down capabilities

### Data Sources

1. **Additional DEXes**: Integrate data from other Stellar DEXes
2. **External APIs**: Include data from CoinGecko, CoinMarketCap
3. **On-chain Metrics**: Incorporate other on-chain indicators
4. **Social Sentiment**: Add social media sentiment analysis

## Troubleshooting

### Common Issues

1. **Insufficient Data**: Minimum 10 data points required for analysis
2. **Date Format Errors**: Use YYYY-MM-DD format for all dates
3. **Cache Issues**: Clear cache if data seems stale
4. **Performance Issues**: Reduce date range for faster analysis

### Debug Mode

Enable debug logging:
```bash
DEBUG=correlation:* npm start
```

### Monitoring

Monitor the correlation analysis endpoints:
- Response times should be under 2 seconds
- Cache hit rate should be above 80%
- Error rate should be below 1%

## Support

For questions or issues with the TVL-Price Correlation Analysis feature:

1. Check the logs for error messages
2. Verify data quality in the historical_tvl table
3. Ensure sufficient historical data exists
4. Review API query parameters for correct format

## License

This feature is part of the Vesting Vault backend and follows the same license terms.
