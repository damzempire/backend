const tvlService = require('./src/services/tvlService');

async function testTVLUpdate() {
  console.log('Testing TVL update and WebSocket broadcast...');

  try {
    // Simulate a vault created event
    const mockVaultData = {
      address: '0x1234567890123456789012345678901234567890',
      name: 'Test Vault',
      token_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      owner_address: '0x9876543210987654321098765432109876543210',
      total_amount: '1000000'
    };

    console.log('Triggering vault created event...');
    await tvlService.handleVaultCreated(mockVaultData);

    // Simulate a claim event
    const mockClaimData = {
      user_address: '0x1111111111111111111111111111111111111111',
      token_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      amount_claimed: '50000',
      transaction_hash: '0xtest123456789',
      block_number: '12345678'
    };

    console.log('Triggering claim event...');
    await tvlService.handleClaim(mockClaimData);

    console.log('TVL updates completed successfully!');
  } catch (error) {
    console.error('Error testing TVL updates:', error);
  }
}

// Run the test
testTVLUpdate();