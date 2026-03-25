# TVL WebSocket Real-Time Implementation

This document describes the implementation of real-time Total Value Locked (TVL) updates via WebSockets.

## Overview

The TVL WebSocket feature provides live-ticking TVL counter updates to clients without requiring polling. The system broadcasts TVL changes immediately after the indexer processes VaultCreated or Claim events.

## Implementation Details

### 1. GraphQL Subscription

**Schema Addition:**
```graphql
type TVLStats {
  totalValueLocked: Decimal!
  activeVaultsCount: Int!
  formattedTvl: String!
  lastUpdatedAt: DateTime!
}

type Subscription {
  tvlUpdated: TVLStats!
}

type Query {
  tvlStats: TVLStats!
}
```

**WebSocket Endpoint:** `ws://localhost:4000/graphql`

### 2. Event Triggers

TVL updates are automatically triggered when:

- **VaultCreated Events:** New vaults are created via `createVault` mutation
- **Vault Top-ups:** Existing vaults receive additional funding via `topUpVault` mutation  
- **Claim Events:** Users claim tokens, reducing the TVL via `processClaim` in indexing service

### 3. Broadcasting Flow

```
Event Occurs → TVL Service Updates → Database Update → WebSocket Broadcast
```

1. Event triggers `tvlService.handleVaultCreated()` or `tvlService.handleClaim()`
2. TVL is recalculated from all active vaults
3. Database TVL record is updated
4. `publishTVLUpdate()` broadcasts via GraphQL subscriptions
5. All connected clients receive real-time updates

### 4. Client Usage

**GraphQL Subscription:**
```graphql
subscription {
  tvlUpdated {
    totalValueLocked
    activeVaultsCount
    formattedTvl
    lastUpdatedAt
  }
}
```

**REST API (for current TVL):**
```
GET /api/stats/tvl
```

## Files Modified/Created

### Core Implementation
- `src/graphql/schema.ts` - Added TVLStats type and tvlUpdated subscription
- `src/graphql/subscriptions/proofSubscription.ts` - Added TVL_UPDATED event and publishTVLUpdate function
- `src/services/tvlService.js` - Added broadcastTVLUpdate method
- `src/graphql/resolvers/tvlResolver.ts` - New resolver for TVL queries
- `src/graphql/resolvers/vaultResolver.ts` - Added TVL updates to topUpVault mutation
- `src/graphql/server.ts` - Integrated TVL resolver

### Testing Files
- `test-tvl-websocket.js` - Node.js WebSocket client test
- `test-tvl-trigger.js` - Script to trigger TVL updates for testing
- `tvl-websocket-test.html` - Browser-based WebSocket test client

## Testing

### 1. Start the Server
```bash
npm start
```

### 2. Test WebSocket Connection
```bash
node test-tvl-websocket.js
```

### 3. Trigger TVL Updates
```bash
node test-tvl-trigger.js
```

### 4. Browser Testing
Open `tvl-websocket-test.html` in a browser and click "Connect"

## Client Integration Examples

### JavaScript/TypeScript
```javascript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://localhost:4000/graphql',
});

const unsubscribe = client.subscribe(
  {
    query: `
      subscription {
        tvlUpdated {
          totalValueLocked
          activeVaultsCount
          formattedTvl
          lastUpdatedAt
        }
      }
    `,
  },
  {
    next: (data) => {
      console.log('TVL Update:', data.data.tvlUpdated);
      // Update your UI here
    },
    error: (err) => console.error('Subscription error:', err),
    complete: () => console.log('Subscription completed'),
  }
);
```

### React Hook Example
```javascript
import { useSubscription } from '@apollo/client';
import { gql } from '@apollo/client';

const TVL_SUBSCRIPTION = gql`
  subscription {
    tvlUpdated {
      totalValueLocked
      activeVaultsCount
      formattedTvl
      lastUpdatedAt
    }
  }
`;

function TVLCounter() {
  const { data, loading, error } = useSubscription(TVL_SUBSCRIPTION);

  if (loading) return <div>Loading TVL...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Total Value Locked</h2>
      <p>{data?.tvlUpdated?.formattedTvl}</p>
      <small>Active Vaults: {data?.tvlUpdated?.activeVaultsCount}</small>
    </div>
  );
}
```

## Performance Considerations

- TVL calculation queries all active vaults on each update
- WebSocket broadcasts are non-blocking and won't fail TVL updates
- Failed broadcasts are logged but don't interrupt the main flow
- Consider implementing TVL caching for high-frequency updates

## Security

- WebSocket connections support authentication via Bearer tokens
- TVL data is public information, no additional authorization required
- Rate limiting is handled by the existing GraphQL middleware

## Monitoring

- All TVL updates are logged to console
- WebSocket broadcast failures are logged as errors
- Use existing application monitoring for WebSocket connection health

## Future Enhancements

- Add TVL historical data subscription
- Implement TVL change percentage calculations
- Add per-token TVL breakdowns
- Consider Redis pub/sub for horizontal scaling