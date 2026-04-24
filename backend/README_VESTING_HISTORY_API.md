# Vesting History API Documentation

Optimized GraphQL and REST endpoints for querying indexed vesting schedules from PostgreSQL, providing sub-millisecond response times for complete vesting history without hitting slow Stellar Horizon/RPC endpoints.

## Overview

The Vesting History API provides fast access to complete vesting data through optimized PostgreSQL queries, eliminating the need to hit rate-limited Stellar endpoints. The system includes both GraphQL and REST interfaces with comprehensive caching and pagination support.

## Architecture

```
Vesting History API
    |
    |-- GraphQL Layer
    |   |-- VestingSchedule type with full details
    |   |-- VestingSummary for user overview
    |   |-- ClaimHistory with enriched data
    |   |-- VestingAnalytics and statistics
    |   `-- Pagination and filtering
    |
    |-- REST Layer
    |   |-- User history endpoint
    |   |-- Vesting summary endpoint
    |   |-- Schedule details endpoint
    |   |-- Claim history endpoint
    |   `-- Statistics endpoint
    |
    |-- Performance Layer
    |   |-- Redis caching (2-5 min TTL)
    |   |-- Optimized PostgreSQL queries
    |   |-- Cursor-based pagination
    |   `-- Sub-second response times
    |
    `-- Data Layer
        |-- SubSchedule model
        |-- Vault model
        |-- ClaimsHistory model
        |-- Beneficiary model
        `-- Organization model
```

## GraphQL API

### Schema Overview

The GraphQL schema extends the existing schema with vesting-specific types:

```graphql
type VestingSchedule {
  id: ID!
  vaultId: ID!
  vaultAddress: String!
  vaultName: String
  tokenAddress: String!
  ownerAddress: String!
  beneficiaryAddress: String!
  organizationName: String
  
  # Financial data
  totalAllocated: BigDecimal!
  totalWithdrawn: BigDecimal!
  remainingAmount: BigDecimal!
  vestedAmount: BigDecimal!
  withdrawableAmount: BigDecimal!
  
  # Schedule details
  topUpAmount: BigDecimal!
  cliffDuration: Int!
  cliffDate: Date
  vestingStartDate: Date!
  vestingDuration: Int!
  startTimestamp: Date!
  endTimestamp: Date!
  
  # Status information
  isActive: Boolean!
  isFullyVested: Boolean!
  isCliffPassed: Boolean!
  vestingProgress: Float!
  nextVestTime: Date
  
  # Associated data
  claims: [ClaimHistory]
  milestones: [VestingMilestone]
}

type VestingSummary {
  userAddress: String!
  totalVaults: Int!
  activeVaults: Int!
  completedVaults: Int!
  
  # Financial summary
  totalAllocated: BigDecimal!
  totalWithdrawn: BigDecimal!
  totalRemaining: BigDecimal!
  totalValueUsd: BigDecimal!
  
  # Performance metrics
  averageVestingProgress: Float!
  nextClaimAmount: BigDecimal!
  nextClaimTime: Date
  
  # Recent activity
  recentClaims: [ClaimHistory]
  upcomingMilestones: [VestingMilestone]
}
```

### Query Examples

#### Get User's Complete Vesting History

```graphql
query GetUserVestingHistory($userAddress: String!, $first: Int!, $after: String) {
  vestingHistory(
    userAddress: $userAddress,
    pagination: { first: $first, after: $after },
    sort: { field: "updatedAt", direction: DESC }
  ) {
    edges {
      node {
        id
        vaultAddress
        vaultName
        tokenAddress
        totalAllocated
        totalWithdrawn
        remainingAmount
        vestedAmount
        withdrawableAmount
        isFullyVested
        isCliffPassed
        vestingProgress
        endTimestamp
        claims {
          id
          amountClaimed
          claimTimestamp
          transactionHash
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

#### Get Vesting Summary

```graphql
query GetVestingSummary($userAddress: String!) {
  vestingSummary(userAddress: $userAddress) {
    userAddress
    totalVaults
    activeVaults
    completedVaults
    totalAllocated
    totalWithdrawn
    totalRemaining
    averageVestingProgress
    nextClaimAmount
    nextClaimTime
    recentClaims {
      id
      vaultAddress
      amountClaimed
      claimTimestamp
    }
    tokensByToken {
      tokenSymbol
      tokenAddress
      totalAllocated
      totalWithdrawn
      totalRemaining
      vaults {
        id
        vaultAddress
        progress
        withdrawableAmount
      }
    }
  }
}
```

#### Get Specific Vesting Schedule

```graphql
query GetVestingSchedule($id: ID!) {
  vestingSchedule(id: $id) {
    id
    vaultAddress
    vaultName
    tokenAddress
    tokenSymbol
    ownerAddress
    organizationName
    beneficiaryAddress
    
    # Financial details
    totalAllocated
    totalWithdrawn
    remainingAmount
    vestedAmount
    withdrawableAmount
    
    # Schedule details
    cliffDate
    vestingStartDate
    vestingDuration
    startTimestamp
    endTimestamp
    
    # Status
    isActive
    isFullyVested
    isCliffPassed
    vestingProgress
    nextVestTime
    
    # Claims and milestones
    claims {
      id
      amountClaimed
      claimTimestamp
      transactionHash
      priceAtClaimUsd
    }
    milestones {
      id
      milestoneType
      description
      targetDate
      targetAmount
      isCompleted
    }
  }
}
```

#### Get Vesting Analytics

```graphql
query GetVestingAnalytics($userAddress: String!, $period: String!) {
  vestingAnalytics(userAddress: $userAddress, period: $period) {
    period
    startDate
    endDate
    
    # Claim analytics
    totalClaims
    totalClaimedAmount
    averageClaimAmount
    claimFrequency
    
    # Vesting progress
    vestingProgressStart
    vestingProgressEnd
    vestingProgressChange
    
    # Daily data
    dailyClaims {
      date
      claimsCount
      amountClaimed
      valueUsd
    }
    
    # Cumulative data
    cumulativeVesting {
      date
      cumulativeVested
      cumulativeClaimed
      progress
    }
  }
}
```

## REST API

### Base URL
```
https://api.vesting-vault.com/api/vesting-history
```

### Endpoints

#### Get User Vesting History

```http
GET /user/{userAddress}/history
```

**Query Parameters:**
- `page` (int, default: 1) - Page number for pagination
- `limit` (int, default: 50, max: 100) - Items per page
- `sortBy` (string, default: 'updatedAt') - Sort field
- `sortOrder` (string, default: 'desc') - Sort direction (asc/desc)
- `status` (string) - Filter by status (active/completed/cliff)
- `dateFrom` (string) - Filter by start date (ISO 8601)
- `dateTo` (string) - Filter by end date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "data": {
    "schedules": [
      {
        "id": "uuid",
        "vaultId": "uuid",
        "vaultAddress": "0x...",
        "vaultName": "My Vault",
        "tokenAddress": "0x...",
        "tokenSymbol": "TOKEN",
        "ownerAddress": "0x...",
        "organizationName": "Org Name",
        "beneficiaryAddress": "0x...",
        
        "totalAllocated": "1000.000000000000000000",
        "totalWithdrawn": "100.000000000000000000",
        "remainingAmount": "900.000000000000000000",
        "vestedAmount": "500.000000000000000000",
        "withdrawableAmount": "400.000000000000000000",
        
        "topUpAmount": "1000.000000000000000000",
        "cliffDuration": 86400,
        "cliffDate": "2024-01-01T00:00:00.000Z",
        "vestingStartDate": "2024-01-02T00:00:00.000Z",
        "vestingDuration": 172800,
        "startTimestamp": "2024-01-02T00:00:00.000Z",
        "endTimestamp": "2024-01-04T00:00:00.000Z",
        
        "isActive": true,
        "isFullyVested": false,
        "isCliffPassed": true,
        "vestingProgress": 0.5,
        "nextVestTime": "2024-01-04T00:00:00.000Z",
        
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "blockNumber": 12345,
        "transactionHash": "0xabcdef...",
        
        "claims": [
          {
            "id": "uuid",
            "amountClaimed": "100.000000000000000000",
            "claimTimestamp": "2024-01-03T00:00:00.000Z",
            "transactionHash": "0x111111...",
            "blockNumber": 12346,
            "priceAtClaimUsd": "1.50"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  },
  "cached": false
}
```

#### Get Vesting Summary

```http
GET /user/{userAddress}/summary
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x...",
    "totalVaults": 3,
    "activeVaults": 2,
    "completedVaults": 1,
    
    "totalAllocated": "5000.000000000000000000",
    "totalWithdrawn": "1500.000000000000000000",
    "totalRemaining": "3500.000000000000000000",
    "totalValueUsd": "5250.00",
    
    "averageVestingProgress": 0.65,
    "nextClaimAmount": "500.000000000000000000",
    "nextClaimTime": "2024-01-05T00:00:00.000Z",
    
    "tokensByToken": [
      {
        "tokenSymbol": "TOKEN1",
        "tokenAddress": "0x...",
        "totalAllocated": "3000.000000000000000000",
        "totalWithdrawn": "1000.000000000000000000",
        "totalRemaining": "2000.000000000000000000",
        "vaults": [
          {
            "id": "uuid",
            "vaultAddress": "0x...",
            "vaultName": "Vault 1",
            "progress": 0.7,
            "withdrawableAmount": "500.000000000000000000"
          }
        ]
      }
    ],
    
    "recentClaims": [
      {
        "id": "uuid",
        "vaultAddress": "0x...",
        "vaultName": "My Vault",
        "tokenSymbol": "TOKEN",
        "amountClaimed": "100.000000000000000000",
        "claimTimestamp": "2024-01-03T00:00:00.000Z",
        "transactionHash": "0x111111..."
      }
    ]
  },
  "cached": false
}
```

#### Get Specific Vesting Schedule

```http
GET /schedule/{scheduleId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vaultId": "uuid",
    "vaultAddress": "0x...",
    "vaultName": "My Vault",
    "tokenAddress": "0x...",
    "tokenSymbol": "TOKEN",
    "tokenDecimals": 18,
    "ownerAddress": "0x...",
    "organizationName": "Org Name",
    "beneficiaryAddress": "0x...",
    
    "totalAllocated": "1000.000000000000000000",
    "totalWithdrawn": "100.000000000000000000",
    "remainingAmount": "900.000000000000000000",
    "vestedAmount": "500.000000000000000000",
    "withdrawableAmount": "400.000000000000000000",
    
    "topUpAmount": "1000.000000000000000000",
    "cliffDuration": 86400,
    "cliffDate": "2024-01-01T00:00:00.000Z",
    "vestingStartDate": "2024-01-02T00:00:00.000Z",
    "vestingDuration": 172800,
    "startTimestamp": "2024-01-02T00:00:00.000Z",
    "endTimestamp": "2024-01-04T00:00:00.000Z",
    
    "isActive": true,
    "isFullyVested": false,
    "isCliffPassed": true,
    "vestingProgress": 0.5,
    "nextVestTime": "2024-01-04T00:00:00.000Z",
    
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "blockNumber": 12345,
    "transactionHash": "0xabcdef...",
    
    "claims": [
      {
        "id": "uuid",
        "amountClaimed": "100.000000000000000000",
        "claimTimestamp": "2024-01-03T00:00:00.000Z",
        "transactionHash": "0x111111...",
        "blockNumber": 12346,
        "priceAtClaimUsd": "1.50",
        "conversionEventId": "uuid"
      }
    ],
    
    "milestones": [
      {
        "id": "uuid",
        "milestoneType": "cliff_end",
        "description": "Cliff period ended",
        "targetDate": "2024-01-02T00:00:00.000Z",
        "targetAmount": "0.000000000000000000",
        "isCompleted": true,
        "completedAt": "2024-01-02T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  },
  "cached": false
}
```

#### Get Claim History

```http
GET /user/{userAddress}/claims
```

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `limit` (int, default: 50, max: 100) - Items per page
- `sortBy` (string, default: 'claim_timestamp') - Sort field
- `sortOrder` (string, default: 'desc') - Sort direction
- `vaultId` (string) - Filter by vault ID
- `dateFrom` (string) - Filter by start date
- `dateTo` (string) - Filter by end date

**Response:**
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "uuid",
        "userAddress": "0x...",
        "tokenAddress": "0x...",
        "vaultId": "uuid",
        "vaultAddress": "0x...",
        "vaultName": "My Vault",
        "tokenSymbol": "TOKEN",
        "amountClaimed": "100.000000000000000000",
        "claimTimestamp": "2024-01-03T00:00:00.000Z",
        "transactionHash": "0x111111...",
        "blockNumber": 12346,
        "priceAtClaimUsd": "1.50",
        "conversionEventId": "uuid",
        "usdValue": "150.00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 2,
      "totalPages": 1,
      "hasNext": false,
      "hasPrevious": false
    }
  }
}
```

#### Get Vesting Statistics

```http
GET /statistics
```

**Query Parameters:**
- `organizationId` (string) - Filter by organization
- `dateFrom` (string) - Filter by start date
- `dateTo` (string) - Filter by end date

**Response:**
```json
{
  "success": true,
  "data": {
    "totalVaults": 150,
    "activeVaults": 120,
    "completedVaults": 30,
    
    "totalAllocated": "1500000.000000000000000000",
    "totalWithdrawn": "450000.000000000000000000",
    "totalRemaining": "1050000.000000000000000000",
    
    "claimsLast24h": 25,
    "claimsLast7d": 150,
    "claimsLast30d": 600
  },
  "cached": false
}
```

#### Clear User Cache

```http
POST /user/{userAddress}/cache/clear
```

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

## Performance Optimizations

### Caching Strategy

- **User History**: 5 minutes TTL
- **User Summary**: 2 minutes TTL
- **Schedule Details**: 5 minutes TTL
- **Statistics**: 10 minutes TTL

### Query Optimization

- **Indexed Queries**: All queries use proper database indexes
- **Joins**: Optimized joins with selective field loading
- **Pagination**: Cursor-based pagination for large datasets
- **Batch Loading**: Related data loaded in batches

### Response Times

- **User History**: < 100ms (cached), < 500ms (uncached)
- **User Summary**: < 50ms (cached), < 200ms (uncached)
- **Schedule Details**: < 50ms (cached), < 150ms (uncached)
- **Claim History**: < 100ms (cached), < 300ms (uncached)

## Usage Examples

### Frontend Integration

#### React Example

```javascript
// GraphQL Query
import { useQuery, gql } from '@apollo/client';

const GET_VESTING_HISTORY = gql`
  query GetUserVestingHistory($userAddress: String!, $first: Int!) {
    vestingHistory(userAddress: $userAddress, pagination: { first: $first }) {
      edges {
        node {
          id
          vaultAddress
          vaultName
          tokenSymbol
          totalAllocated
          totalWithdrawn
          remainingAmount
          vestedAmount
          withdrawableAmount
          isFullyVested
          vestingProgress
          endTimestamp
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function VestingHistory({ userAddress }) {
  const { data, loading, error, fetchMore } = useQuery(GET_VESTING_HISTORY, {
    variables: { userAddress, first: 20 }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const { edges, pageInfo } = data.vestingHistory;

  return (
    <div>
      {edges.map(({ node }) => (
        <VestingCard key={node.id} schedule={node} />
      ))}
      
      {pageInfo.hasNextPage && (
        <button
          onClick={() => fetchMore({
            variables: {
              after: pageInfo.endCursor
            },
            updateQuery: (prev, { fetchMoreResult }) => {
              return {
                vestingHistory: {
                  edges: [...prev.vestingHistory.edges, ...fetchMoreResult.vestingHistory.edges],
                  pageInfo: fetchMoreResult.vestingHistory.pageInfo
                }
              };
            }
          })}
        >
          Load More
        </button>
      )}
    </div>
  );
}
```

#### REST API Example

```javascript
// REST API Call
async function fetchVestingHistory(userAddress, page = 1, limit = 50) {
  const response = await fetch(
    `/api/vesting-history/user/${userAddress}/history?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

// Usage
const history = await fetchVestingHistory('0x1234...', 1, 20);
console.log(history.schedules);
console.log(history.pagination);
```

### Mobile App Integration

#### Flutter Example

```dart
class VestingService {
  final String baseUrl = 'https://api.vesting-vault.com/api/vesting-history';
  
  Future<VestingHistoryResponse> getVestingHistory(
    String userAddress, {
    int page = 1,
    int limit = 50,
    String? status,
    String? dateFrom,
    String? dateTo,
  }) async {
    final queryParams = <String>[
      'page=$page',
      'limit=$limit',
      if (status != null) 'status=$status',
      if (dateFrom != null) 'dateFrom=$dateFrom',
      if (dateTo != null) 'dateTo=$dateTo',
    ].join('&');
    
    final response = await http.get(
      Uri.parse('$baseUrl/user/$userAddress/history?$queryParams'),
      headers: {'Authorization': 'Bearer $token'},
    );
    
    if (response.statusCode == 200) {
      return VestingHistoryResponse.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to load vesting history');
    }
  }
}
```

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message description"
}
```

### Common Error Codes

- **400 Bad Request**: Invalid parameters
- **401 Unauthorized**: Missing or invalid authentication
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### GraphQL Errors

```graphql
{
  "errors": [
    {
      "message": "User address is required",
      "locations": [{"line": 2, "column": 3}],
      "path": ["vestingHistory"],
      "extensions": {"code": "BAD_USER_INPUT"}
    }
  ],
  "data": null
}
```

## Rate Limiting

### Limits
- **REST API**: 100 requests/minute per IP
- **GraphQL**: 100 queries/minute per IP
- **Cache Clear**: 10 requests/minute per user

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Monitoring

### Metrics Available

- **Response Times**: Average, p95, p99
- **Cache Hit Rates**: By endpoint
- **Query Performance**: Database query times
- **Error Rates**: By endpoint and error type

### Health Check

```http
GET /api/vesting-history/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "cache": "connected",
  "uptime": 86400
}
```

## Testing

### Example Test Cases

#### REST API Tests

```bash
# Get user history
curl -X GET "https://api.vesting-vault.com/api/vesting-history/user/0x1234.../history?page=1&limit=10" \
  -H "Authorization: Bearer your-token"

# Get user summary
curl -X GET "https://api.vesting-vault.com/api/vesting-history/user/0x1234.../summary" \
  -H "Authorization: Bearer your-token"

# Get specific schedule
curl -X GET "https://api.vesting-vault.com/api/vesting-history/schedule/uuid" \
  -H "Authorization: Bearer your-token"
```

#### GraphQL Tests

```bash
# GraphQL Query
curl -X POST "https://api.vesting-vault.com/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "query": "query { vestingHistory(userAddress: \"0x1234...\") { edges { node { id vaultAddress totalAllocated } } } }"
  }'
```

## Deployment

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/vesting_vault

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# API Configuration
API_BASE_URL=https://api.vesting-vault.com
NODE_ENV=production

# Performance
CACHE_TTL_HISTORY=300
CACHE_TTL_SUMMARY=120
MAX_PAGE_SIZE=100
```

### Docker Configuration

```dockerfile
FROM node:18-alpine

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY . .

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

## Security

### Authentication
- JWT tokens required for all endpoints
- Token expiration: 24 hours
- Refresh tokens supported

### Data Validation
- Input validation for all parameters
- SQL injection prevention
- XSS protection

### Rate Limiting
- IP-based rate limiting
- User-based rate limiting
- DDoS protection

## Best Practices

### Frontend Integration
1. **Use GraphQL**: For complex data fetching with caching
2. **Implement Pagination**: Handle large datasets efficiently
3. **Cache Responses**: Implement client-side caching
4. **Error Handling**: Graceful error handling and retry logic

### Performance
1. **Batch Requests**: Combine multiple queries when possible
2. **Optimize Queries**: Use only required fields
3. **Monitor Performance**: Track response times and errors
4. **Use CDN**: Cache static responses at edge

### Security
1. **Validate Inputs**: Always validate user input
2. **Use HTTPS**: Encrypt all API communications
3. **Secure Tokens**: Store tokens securely
4. **Rate Limit**: Implement client-side rate limiting

This API provides a comprehensive, high-performance solution for accessing vesting data, replacing slow Stellar RPC calls with optimized PostgreSQL queries while maintaining full data integrity and real-time accuracy.
