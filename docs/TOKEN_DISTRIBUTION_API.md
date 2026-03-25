# Token Distribution API

This API provides token distribution data categorized by vault tags, perfect for powering tokenomics pie charts on the frontend.

## Overview

The endpoint aggregates all vault amounts for a specific token address and groups them by their `tag` field, returning the total amount for each category.

## Database Schema

The `vaults` table includes:
- `tag` (VARCHAR(50), nullable): Vault category tag (e.g., Seed, Private, Advisors, Team)
- `total_amount` (DECIMAL(36, 18)): Total tokens allocated to the vault
- `token_address` (STRING): Address of the token contract

## API Endpoint

### GET /api/token/:address/distribution

Returns token distribution data grouped by vault tags.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | string | Yes | Token contract address |

#### Response

**Success (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "label": "Team",
      "amount": 7000000
    },
    {
      "label": "Seed", 
      "amount": 8000000
    },
    {
      "label": "Private",
      "amount": 3000000
    },
    {
      "label": "Advisors",
      "amount": 1000000
    }
  ]
}
```

**Error (500 Internal Server Error)**
```json
{
  "success": false,
  "error": "Error message"
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether the request was successful |
| data | array | Array of distribution objects |
| data[].label | string | The vault tag/category name |
| data[].amount | number | Total amount of tokens in this category |

## Behavior

- **Aggregation**: Groups vaults by their `tag` field and sums `total_amount`
- **Filtering**: Only includes vaults with `total_amount > 0` and non-null tags
- **Sorting**: Returns results sorted by amount in descending order
- **Null Tags**: Vaults with null/undefined tags are excluded from results
- **Zero Amounts**: Vaults with zero amounts are excluded from results

## Common Tags

Typical vault tags include:
- `Team` - Team member allocations
- `Advisors` - Advisor allocations  
- `Seed` - Seed round investors
- `Private` - Private sale investors
- `Public` - Public sale investors
- `Community` - Community/ecosystem funds
- `Treasury` - Company treasury
- `Liquidity` - Liquidity provision

## Usage Examples

### Frontend Pie Chart

```javascript
// Fetch distribution data
const response = await fetch('/api/token/0x1234567890123456789012345678901234567890/distribution');
const { data } = await response.json();

// Use with chart libraries
const chartData = data.map(item => ({
  name: item.label,
  value: item.amount
}));

// Example with Chart.js
new Chart(ctx, {
  type: 'pie',
  data: {
    labels: data.map(item => item.label),
    datasets: [{
      data: data.map(item => item.amount),
      backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0']
    }]
  }
});
```

### Calculate Percentages

```javascript
const total = data.reduce((sum, item) => sum + item.amount, 0);
const percentages = data.map(item => ({
  label: item.label,
  amount: item.amount,
  percentage: ((item.amount / total) * 100).toFixed(2)
}));
```

## Database Migration

Apply migration `007_add_tag_to_vaults.sql` to add the tag field to existing vaults:

```sql
ALTER TABLE vaults ADD COLUMN tag VARCHAR(50);
COMMENT ON COLUMN vaults.tag IS 'Vault category tag (e.g., Seed, Private, Advisors, Team)';
CREATE INDEX idx_vaults_tag ON vaults(tag) WHERE tag IS NOT NULL;
```

## Performance Considerations

- **Indexing**: The `tag` field is indexed for faster grouping queries
- **Filtering**: Only queries vaults with non-zero amounts to reduce processing
- **Caching**: Consider caching results for frequently accessed tokens

## Error Handling

- **Invalid Address**: Returns 500 for malformed addresses
- **No Data**: Returns empty array if no vaults found for the token
- **Database Errors**: Returns 500 with error message

## Testing

Run the test script to verify functionality:

```bash
cd backend
node test-token-distribution.js
```

The test script:
- Creates sample vault data with different tags
- Tests the API endpoint
- Verifies correct aggregation and sorting
- Tests edge cases (non-existent tokens, invalid addresses)
- Cleans up test data

## Integration Notes

- **Real-time Updates**: Distribution reflects current vault amounts
- **Token Decimals**: Amounts are returned as raw numbers, apply token decimals as needed
- **Multiple Tokens**: Each token has its own distribution based on its vaults
- **Empty Tags**: Vaults without tags are not included in distribution
