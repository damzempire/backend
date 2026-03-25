# Wallet-Based Rate Limiting Implementation

## Overview

This implementation adds Redis-backed rate limiting based on the `x-wallet-address` header to prevent Sybil attacks from scraping public vault data.

## Features

- **Redis-backed storage**: Uses Redis for distributed rate limiting across multiple server instances
- **Wallet-based identification**: Rate limits requests based on `x-wallet-address` header rather than IP address
- **Configurable limits**: Default is 100 requests per minute per wallet
- **Graceful degradation**: Falls back to allowing requests if Redis is unavailable
- **Express and GraphQL middleware**: Supports both REST API and GraphQL endpoints
- **Comprehensive testing**: Includes unit tests and integration tests

## Architecture

### Core Components

1. **WalletRateLimiter Class** (`src/util/wallet-ratelimit.util.js`)
   - Handles Redis operations for rate limiting
   - Validates wallet addresses
   - Manages sliding window rate limiting using Redis sorted sets

2. **Express Middleware** (`src/middleware/wallet-ratelimit.middleware.js`)
   - Intercepts HTTP requests with `x-wallet-address` header
   - Applies rate limiting and returns appropriate HTTP status codes
   - Adds rate limit headers to responses

3. **GraphQL Middleware** (`src/middleware/wallet-ratelimit.middleware.js`)
   - Integrates with GraphQL resolvers
   - Provides rate limiting for GraphQL operations
   - Returns structured errors for rate limit violations

## Configuration

### Environment Variables

```bash
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
```
~
### Rate Limit Settings

Default configuration:
- **Window**: 60 seconds (1 minute)
- **Limit**: 100 requests per window per wallet
- **Header**: `x-wallet-address`

## Usage

### Express API Integration

The middleware is automatically applied to all `/api` routes in `src/index.js`:

```javascript
app.use('/api', walletRateLimitMiddleware);
```

### GraphQL Integration

For GraphQL endpoints, use the middleware wrapper:

```javascript
const { graphqlWalletRateLimitMiddleware } = require('./middleware/wallet-ratelimit.middleware');

// Apply to specific resolvers or globally
const rateLimitedResolver = graphqlWalletRateLimitMiddleware()(resolveFunction);
```

## API Behavior

### Request Headers

Clients should include the wallet address in the `x-wallet-address` header:

```http
GET /api/vaults
x-wallet-address: 0x1234567890abcdef1234567890abcdef12345678
```

### Response Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-02-24T09:45:00.000Z
X-RateLimit-Policy: 100;w=60;wallet=0x1234567890abcdef1234567890abcdef12345678
```

### Rate Limit Exceeded

When the limit is exceeded, the API returns:

**HTTP/REST:**
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests from this wallet. Please try again later.",
  "rateLimitInfo": {
    "limit": 100,
    "remaining": 0,
    "resetTime": "2024-02-24T09:45:00.000Z",
    "windowMs": 60000,
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "retryAfter": 45
  }
}
```

**GraphQL:**
```json
{
  "errors": [
    {
      "message": "Too many requests from this wallet. Please try again later.",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED",
        "rateLimitInfo": {
          "limit": 100,
          "current": 101,
          "remaining": 0,
          "resetTime": "2024-02-24T09:45:00.000Z",
          "windowMs": 60000,
          "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
          "retryAfter": 45
        }
      }
    }
  ]
}
```

## Testing

### Run Tests

```bash
# Run the wallet rate limiting test
node test-wallet-ratelimit.js

# Run Jest tests (when Jest is configured)
npm test
```

### Test Coverage

The implementation includes comprehensive tests covering:
- Wallet address validation
- Rate limiting within limits
- Rate limit enforcement
- Redis error handling
- Middleware behavior
- GraphQL integration

## Redis Data Structure

The rate limiter uses Redis sorted sets to implement a sliding window:

```
Key: rate_limit:wallet:{wallet_address}
Type: Sorted Set
Score: Timestamp (milliseconds)
Value: Unique request identifier
```

## Security Considerations

1. **Wallet Address Validation**: Basic alphanumeric validation prevents injection attacks
2. **Fail-Open Behavior**: Requests are allowed if Redis is unavailable to prevent service disruption
3. **Rate Limit Headers**: Expose minimal information to prevent information leakage
4. **Sliding Window**: Prevents burst attacks by using a true sliding window approach

## Performance

- **Redis Operations**: Uses efficient Redis sorted set operations (O(log N) for most operations)
- **Memory Usage**: Automatically expires old entries to prevent memory leaks
- **Concurrent Safety**: Redis provides atomic operations for thread-safe rate limiting

## Monitoring

Monitor Redis memory usage and performance in production:

```bash
# Redis memory usage
redis-cli info memory

# Redis rate limit keys
redis-cli keys "rate_limit:wallet:*"
```

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**: Check Redis server status and connection parameters
2. **Rate Limit Not Working**: Verify `x-wallet-address` header is being sent
3. **High Memory Usage**: Check Redis memory configuration and key expiration

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=rate-limit*
```

## Future Enhancements

- **Dynamic Rate Limits**: Different limits for different user tiers
- **Burst Allowance**: Allow short bursts within the rate limit
- **Distributed Locking**: Enhanced consistency across multiple Redis instances
- **Metrics Integration**: Prometheus/Grafana metrics for rate limiting
