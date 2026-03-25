# REST to GraphQL Migration Guide

This guide helps you migrate from the REST API to the new GraphQL API for the Verinode Vesting Vault system.

## Overview

The GraphQL API provides the same functionality as the REST API but with additional benefits:
- **Flexible queries**: Request only the data you need
- **Real-time subscriptions**: Get live updates for vault changes, claims, and withdrawals
- **Single endpoint**: All operations through `/graphql`
- **Strong typing**: Built-in schema validation
- **Introspection**: Self-documenting API

## Endpoint Comparison

| REST Endpoint | GraphQL Equivalent | Operation Type |
|---------------|-------------------|----------------|
| `GET /api/vaults/:vaultAddress/schedule` | `query vaultSchedule` | Query |
| `POST /api/vaults` | `mutation createVault` | Mutation |
| `POST /api/vaults/:vaultAddress/top-up` | `mutation topUpVault` | Mutation |
| `POST /api/vaults/:vaultAddress/:beneficiaryAddress/withdraw` | `mutation withdraw` | Mutation |
| `GET /api/vaults/:vaultAddress/summary` | `query vaultSummary` | Query |
| `POST /api/claims` | `mutation processClaim` | Mutation |
| `POST /api/claims/batch` | `mutation processBatchClaims` | Mutation |
| `GET /api/claims/:userAddress/realized-gains` | `query realizedGains` | Query |
| `POST /api/admin/revoke` | `mutation revokeAccess` | Mutation |
| `GET /api/admin/audit-logs` | `query auditLogs` | Query |

## Authentication

### REST API
```bash
# Using headers
curl -X POST http://localhost:3000/api/vaults \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123..."}'
```

### GraphQL API
```bash
# Using headers
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation CreateVault($input: CreateVaultInput!) { createVault(input: $input) { id address } }",
    "variables": {"input": {"address": "0x123...", "tokenAddress": "0xabc...", "ownerAddress": "0xowner...", "totalAmount": "1000"}}
  }'
```

## Query Migration Examples

### 1. Getting Vault Information

**REST:**
```bash
GET /api/vaults/0x123.../summary
```

**GraphQL:**
```graphql
query GetVaultSummary($vaultAddress: String!) {
  vault(address: $vaultAddress) {
    id
    address
    name
    totalAmount
    summary {
      totalAllocated
      totalWithdrawn
      remainingAmount
      activeBeneficiaries
    }
    beneficiaries {
      address
      totalAllocated
      totalWithdrawn
    }
  }
}
```

### 2. Getting User Claims

**REST:**
```bash
GET /api/claims/0xuser.../realized-gains?startDate=2024-01-01&endDate=2024-12-31
```

**GraphQL:**
```graphql
query GetRealizedGains($userAddress: String!, $startDate: DateTime, $endDate: DateTime) {
  realizedGains(userAddress: $userAddress, startDate: $startDate, endDate: $endDate) {
    totalGains
    claims {
      id
      amountClaimed
      claimTimestamp
      priceAtClaimUsd
    }
    periodStart
    periodEnd
  }
}
```

### 3. Getting Beneficiary Information

**REST:**
```bash
GET /api/vaults/0x123.../0xbeneficiary.../withdrawable?timestamp=1640995200
```

**GraphQL:**
```graphql
query GetWithdrawableAmount($vaultAddress: String!, $beneficiaryAddress: String!, $withdrawableAt: DateTime) {
  beneficiary(vaultAddress: $vaultAddress, beneficiaryAddress: $beneficiaryAddress) {
    address
    totalAllocated
    totalWithdrawn
    withdrawableAmount(withdrawableAt: $withdrawableAt) {
      totalWithdrawable
      vestedAmount
      remainingAmount
      isFullyVested
      nextVestTime
    }
  }
}
```

## Mutation Migration Examples

### 1. Creating a Vault

**REST:**
```bash
POST /api/vaults
{
  "address": "0x123...",
  "tokenAddress": "0xabc...",
  "ownerAddress": "0xowner...",
  "totalAmount": "1000"
}
```

**GraphQL:**
```graphql
mutation CreateVault($input: CreateVaultInput!) {
  createVault(input: $input) {
    id
    address
    name
    tokenAddress
    ownerAddress
    totalAmount
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "address": "0x123...",
    "tokenAddress": "0xabc...",
    "ownerAddress": "0xowner...",
    "totalAmount": "1000"
  }
}
```

### 2. Processing a Withdrawal

**REST:**
```bash
POST /api/vaults/0x123.../0xbeneficiary.../withdraw
{
  "amount": "100",
  "transactionHash": "0xtx...",
  "blockNumber": "12345"
}
```

**GraphQL:**
```graphql
mutation Withdraw($input: WithdrawalInput!) {
  withdraw(input: $input) {
    totalWithdrawable
    vestedAmount
    remainingAmount
    isFullyVested
    nextVestTime
  }
}
```

**Variables:**
```json
{
  "input": {
    "vaultAddress": "0x123...",
    "beneficiaryAddress": "0xbeneficiary...",
    "amount": "100",
    "transactionHash": "0xtx...",
    "blockNumber": "12345"
  }
}
```

### 3. Processing Claims

**REST:**
```bash
POST /api/claims/batch
{
  "claims": [
    {
      "userAddress": "0xuser...",
      "tokenAddress": "0xtoken...",
      "amountClaimed": "100",
      "claimTimestamp": "2024-01-01T00:00:00Z",
      "transactionHash": "0xtx1...",
      "blockNumber": "12345"
    }
  ]
}
```

**GraphQL:**
```graphql
mutation ProcessBatchClaims($claims: [ClaimInput!]!) {
  processBatchClaims(claims: $claims) {
    id
    userAddress
    tokenAddress
    amountClaimed
    claimTimestamp
    transactionHash
  }
}
```

## Real-time Subscriptions

GraphQL provides real-time capabilities that don't exist in the REST API:

### 1. Subscribe to Vault Updates
```graphql
subscription VaultUpdated($vaultAddress: String) {
  vaultUpdated(vaultAddress: $vaultAddress) {
    id
    address
    totalAmount
    summary {
      totalAllocated
      totalWithdrawn
    }
  }
}
```

### 2. Subscribe to New Claims
```graphql
subscription NewClaim($userAddress: String) {
  newClaim(userAddress: $userAddress) {
    id
    userAddress
    amountClaimed
    claimTimestamp
    transactionHash
  }
}
```

### 3. Subscribe to Withdrawal Updates
```graphql
subscription WithdrawalProcessed($vaultAddress: String, $beneficiaryAddress: String) {
  withdrawalProcessed(vaultAddress: $vaultAddress, beneficiaryAddress: $beneficiaryAddress) {
    totalWithdrawable
    vestedAmount
    remainingAmount
    isFullyVested
  }
}
```

## Error Handling

### REST API Errors
```json
{
  "success": false,
  "error": "Vault not found"
}
```

### GraphQL API Errors
```json
{
  "errors": [
    {
      "message": "Vault not found",
      "locations": [{"line": 2, "column": 3}],
      "path": ["vault"],
      "extensions": {
        "code": "NOT_FOUND",
        "exception": {
          "stacktrace": ["Error: Vault not found..."]
        }
      }
    }
  ],
  "data": {
    "vault": null
  }
}
```

## Rate Limiting

Both APIs implement rate limiting, but GraphQL provides more detailed information:

### REST API
- Simple HTTP 429 response
- Basic rate limit headers

### GraphQL API
- Detailed error information
- Rate limit info in error extensions
- Role-based rate limiting
- Operation-specific limits

## Client Integration

### JavaScript/TypeScript

**REST (using fetch):**
```typescript
const response = await fetch('/api/vaults/0x123.../summary');
const data = await response.json();
```

**GraphQL (using Apollo Client):**
```typescript
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache()
});

const { data } = await client.query({
  query: gql`
    query GetVault($address: String!) {
      vault(address: $address) {
        id
        address
        summary {
          totalAllocated
          totalWithdrawn
        }
      }
    }
  `,
  variables: { address: '0x123...' }
});
```

## Migration Strategy

### Phase 1: Parallel Operation
- Keep REST API running
- Implement GraphQL alongside
- Test GraphQL endpoints against REST
- Compare results for consistency

### Phase 2: Gradual Migration
- Migrate read operations first (queries)
- Update client applications to use GraphQL for reads
- Gradually migrate write operations (mutations)
- Implement real-time features using subscriptions

### Phase 3: Full Migration
- Decommission REST API endpoints
- Optimize GraphQL resolvers
- Implement advanced GraphQL features (caching, etc.)

## Best Practices

1. **Start with queries**: Migrate read operations first as they're lower risk
2. **Use fragments**: Organize reusable field selections
3. **Implement error boundaries**: Handle GraphQL errors gracefully
4. **Cache responses**: Use Apollo Client caching for better performance
5. **Monitor performance**: Track resolver performance and optimize slow queries
6. **Use subscriptions**: Replace polling with real-time subscriptions where appropriate

## Testing Your Migration

### 1. Consistency Testing
```bash
# Compare REST and GraphQL responses
curl "/api/vaults/0x123.../summary" > rest_response.json
curl -X POST "/graphql" -d '{"query":"{ vault(address:\"0x123...\") { summary { totalAllocated totalWithdrawn } } }"}' > graphql_response.json
```

### 2. Load Testing
- Use tools like Artillery or k6 to test both APIs
- Compare performance metrics
- Ensure GraphQL doesn't introduce performance regressions

### 3. Integration Testing
- Test client applications with both APIs
- Verify error handling
- Test authentication and authorization

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Ensure headers are properly formatted
   - Check token validation logic
   - Verify user role assignments

2. **Missing fields in response**
   - GraphQL requires explicit field selection
   - Check if all required fields are requested
   - Verify resolver implementations

3. **Subscription not working**
   - Ensure WebSocket connection is established
   - Check subscription event publishing
   - Verify client-side subscription handling

4. **Performance issues**
   - Check for N+1 queries in resolvers
   - Implement data loader for batch fetching
   - Add appropriate database indexes

## Support

For migration support:
1. Check the GraphQL schema documentation
2. Use GraphQL Playground for testing queries
3. Review the resolver implementations
4. Monitor server logs for errors
5. Contact the development team for assistance
