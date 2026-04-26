# TVL-Price Correlation Analysis Setup Guide

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Navigate to the backend directory:**
```bash
cd backend/backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. **Run database migrations:**
```bash
npm run migrate
```

5. **Start the application:**
```bash
npm start
```

### Testing the Implementation

1. **Run the correlation test script:**
```bash
node test-correlation.js
```

2. **Run unit tests:**
```bash
npm test -- tvlPriceCorrelationService.test.js
```

3. **Test API endpoints:**
```bash
# Test correlation analysis
curl "http://localhost:4000/api/correlation/analysis"

# Test chart data
curl "http://localhost:4000/api/correlation/chart"

# Test marketing insights
curl "http://localhost:4000/api/correlation/insights"

# Test historical TVL data
curl "http://localhost:4000/api/correlation/historical-tvl"
```

## Database Setup

### Manual Migration

If npm migrate doesn't work, run the SQL migration manually:

```sql
-- Run this in your PostgreSQL database
-- File: migrations/014_create_historical_tvl_table.sql
```

### Verify Table Creation

```sql
-- Check if table exists
\d historical_tvl;

-- Verify indexes
\d+ historical_tvl;
```

## Sample Data Creation

### Create Test TVL Snapshots

```bash
# Create a TVL snapshot (requires admin auth)
curl -X POST "http://localhost:4000/api/correlation/create-snapshot" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"snapshotDate": "2023-01-01"}'
```

### Generate Historical Data

For testing purposes, you can generate sample historical data:

```javascript
// In a Node.js console
const tvlService = require('./src/services/tvlService');

// Create snapshots for the last 30 days
for (let i = 30; i >= 0; i--) {
  const date = new Date();
  date.setDate(date.getDate() - i);
  await tvlService.createHistoricalSnapshot(date);
}
```

## API Usage Examples

### Basic Correlation Analysis

```bash
curl "http://localhost:4000/api/correlation/analysis?startDate=2023-01-01&endDate=2023-03-31"
```

### Token-Specific Analysis

```bash
curl "http://localhost:4000/api/correlation/analysis?tokenAddress=YOUR_TOKEN_ADDRESS&correlationType=spearman"
```

### Marketing Insights

```bash
curl "http://localhost:4000/api/correlation/insights?startDate=2023-01-01&endDate=2023-12-31"
```

## Troubleshooting

### Common Issues

1. **"Insufficient data for correlation analysis"**
   - Need at least 10 data points
   - Check if historical_tvl table has data
   - Verify date range includes data

2. **"Invalid date format"**
   - Use YYYY-MM-DD format
   - Example: 2023-01-31

3. **Database connection errors**
   - Check .env database settings
   - Verify PostgreSQL is running
   - Test database connection

### Debug Mode

Enable debug logging:

```bash
DEBUG=correlation:* npm start
```

### Clear Cache

Clear correlation analysis cache:

```bash
curl -X DELETE "http://localhost:4000/api/correlation/cache" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Production Deployment

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vesting_vault
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vesting_vault
DB_USER=user
DB_PASSWORD=password

# API
PORT=4000
NODE_ENV=production

# Optional: Price API keys
COINGECKO_API_KEY=your_coingecko_key
COINMARKETCAP_API_KEY=your_cmc_key
```

### Scheduled Jobs

Set up a cron job to create daily TVL snapshots:

```bash
# Edit crontab
crontab -e

# Add this line for daily snapshot at 1 AM
0 1 * * * /usr/bin/node /path/to/backend/backend/src/scripts/create-daily-snapshot.js
```

### Monitoring

Monitor these metrics:
- API response times (< 2 seconds)
- Cache hit rate (> 80%)
- Error rate (< 1%)
- Database query performance

## Performance Optimization

### Database Indexes

Ensure these indexes exist:
```sql
CREATE INDEX CONCURRENTLY idx_historical_tvl_snapshot_date ON historical_tvl(snapshot_date);
CREATE INDEX CONCURRENTLY idx_historical_tvl_date_token ON historical_tvl(snapshot_date, token_address);
```

### Caching

The service includes 5-minute caching for correlation analysis results. Adjust cache timeout in `tvlPriceCorrelationService.js`:

```javascript
this.cacheTimeout = 300000; // 5 minutes in milliseconds
```

### Query Optimization

For large date ranges, consider:
- Pagination
- Data sampling
- Pre-aggregated summaries

## Security Considerations

### API Authentication

- Admin endpoints require authentication
- Use JWT tokens for secure access
- Implement rate limiting

### Data Privacy

- No sensitive personal data stored
- Historical data is aggregated
- Consider data retention policies

## Support

For issues with the TVL-Price Correlation Analysis:

1. Check application logs
2. Verify database connectivity
3. Test with sample data
4. Review API documentation
5. Check this troubleshooting guide

## Next Steps

After successful setup:

1. Generate historical data for meaningful analysis
2. Set up automated daily snapshots
3. Configure monitoring and alerting
4. Create marketing materials using the insights
5. Integrate with your frontend application
