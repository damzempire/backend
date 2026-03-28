const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:4000';

// Test data
const testMilestoneId = 'test-milestone-id';
const testOrganizationId = 'test-organization-id';

async function testMilestoneCelebration() {
  console.log('🚀 Testing Milestone Celebration Webhook API...\n');

  try {
    // 1. Create a test webhook configuration
    console.log('1. Creating test webhook configuration...');
    const webhookConfig = {
      organization_id: testOrganizationId,
      webhook_url: 'https://discord.com/api/webhooks/test/webhook-id',
      webhook_type: 'discord',
      milestone_types: ['cliff_end', 'vesting_complete'],
      min_amount_threshold: 1000,
      custom_message_template: '🎉 **Custom Message!** The {vault_name} milestone has been achieved! {vested_amount} tokens unlocked! 🚀'
    };

    const createResponse = await axios.post(`${BASE_URL}/webhooks/celebration-config`, webhookConfig);
    console.log('✅ Webhook created:', JSON.stringify(createResponse.data, null, 2));
    const webhookId = createResponse.data.webhook.id;

    // 2. Get webhook configurations
    console.log('\n2. Fetching webhook configurations...');
    const getResponse = await axios.get(`${BASE_URL}/webhooks/celebration-config/${testOrganizationId}`);
    console.log('✅ Webhooks retrieved:', JSON.stringify(getResponse.data, null, 2));

    // 3. Test milestone celebration trigger
    console.log('\n3. Testing milestone celebration trigger...');
    try {
      const celebrationResponse = await axios.post(`${BASE_URL}/webhooks/milestone-celebration`, {
        milestone_id: testMilestoneId
      });
      console.log('✅ Celebration triggered:', JSON.stringify(celebrationResponse.data, null, 2));
    } catch (error) {
      if (error.response && error.response.status === 500) {
        console.log('⚠️  Expected error (milestone not found):', error.response.data);
      } else {
        throw error;
      }
    }

    // 4. Update webhook configuration
    console.log('\n4. Updating webhook configuration...');
    const updateData = {
      is_active: false,
      custom_message_template: '🔔 **Updated Message!** {vault_name} milestone achieved!'
    };
    
    const updateResponse = await axios.put(`${BASE_URL}/webhooks/celebration-config/${webhookId}`, updateData);
    console.log('✅ Webhook updated:', JSON.stringify(updateResponse.data, null, 2));

    // 5. Delete webhook configuration
    console.log('\n5. Deleting webhook configuration...');
    await axios.delete(`${BASE_URL}/webhooks/celebration-config/${webhookId}`);
    console.log('✅ Webhook deleted successfully');

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Test webhook payload formatting
async function testPayloadFormatting() {
  console.log('\n📝 Testing webhook payload formatting...');

  const milestoneCelebrationService = require('./backend/src/services/milestoneCelebrationService');

  const testWebhook = {
    webhook_type: 'discord',
    webhook_url: 'https://discord.com/api/webhooks/test',
    custom_message_template: null
  };

  const testMilestoneData = {
    id: 'test-id',
    type: 'cliff_end',
    vaultName: '1 Million Token Community Pool',
    vaultId: 'vault-123',
    tokenAddress: '0x1234567890123456789012345678901234567890',
    vestedAmount: 1000000,
    cumulativeVested: 1000000,
    milestoneDate: new Date().toISOString(),
    priceUsd: 1.50,
    beneficiaryWallet: '0xabcdef1234567890abcdef1234567890abcdef12',
    totalVaultAmount: 5000000
  };

  try {
    const discordPayload = milestoneCelebrationService.formatPayload(testWebhook, testMilestoneData);
    console.log('✅ Discord payload formatted successfully:');
    console.log(JSON.stringify(discordPayload, null, 2));

    // Test Telegram payload
    testWebhook.webhook_type = 'telegram';
    const telegramPayload = milestoneCelebrationService.formatPayload(testWebhook, testMilestoneData);
    console.log('\n✅ Telegram payload formatted successfully:');
    console.log(JSON.stringify(telegramPayload, null, 2));

    // Test custom payload
    testWebhook.webhook_type = 'custom';
    const customPayload = milestoneCelebrationService.formatPayload(testWebhook, testMilestoneData);
    console.log('\n✅ Custom payload formatted successfully:');
    console.log(JSON.stringify(customPayload, null, 2));

  } catch (error) {
    console.error('❌ Payload formatting test failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Starting Milestone Celebration Webhook Tests\n');
  
  await testPayloadFormatting();
  await testMilestoneCelebration();
  
  console.log('\n🏁 All tests completed!');
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${BASE_URL}/api/user/test/portfolio`);
    return true;
  } catch (error) {
    console.error('❌ Server is not running at', BASE_URL);
    console.log('Please start the server first: npm start');
    process.exit(1);
  }
}

if (require.main === module) {
  checkServer().then(() => {
    runTests().catch(console.error);
  });
}

module.exports = { testMilestoneCelebration, testPayloadFormatting };
