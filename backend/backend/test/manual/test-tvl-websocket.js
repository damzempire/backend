const WebSocket = require('ws');

// Test TVL WebSocket subscription
async function testTVLWebSocket() {
  console.log('Testing TVL WebSocket subscription...');

  const ws = new WebSocket('ws://localhost:4000/graphql', 'graphql-ws');

  ws.on('open', () => {
    console.log('WebSocket connected');

    // Send connection init
    ws.send(JSON.stringify({
      type: 'connection_init',
      payload: {}
    }));
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Received message:', message);

    if (message.type === 'connection_ack') {
      console.log('Connection acknowledged, starting TVL subscription...');
      
      // Start TVL subscription
      ws.send(JSON.stringify({
        id: 'tvl-sub',
        type: 'start',
        payload: {
          query: `
            subscription {
              tvlUpdated {
                totalValueLocked
                activeVaultsCount
                formattedTvl
                lastUpdatedAt
              }
            }
          `
        }
      }));
    }

    if (message.type === 'data' && message.id === 'tvl-sub') {
      console.log('TVL Update received:', message.payload.data.tvlUpdated);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });

  // Keep the connection alive for testing
  setTimeout(() => {
    console.log('Closing test connection...');
    ws.close();
  }, 30000);
}

// Run the test
testTVLWebSocket().catch(console.error);