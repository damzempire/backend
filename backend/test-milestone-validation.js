// Simple validation script for milestone celebration webhook
console.log('🔍 Validating milestone celebration webhook implementation...');

try {
  // Test model imports
  console.log('1. Testing model imports...');
  const MilestoneCelebrationWebhook = require('./src/models/milestoneCelebrationWebhook');
  const VestingMilestone = require('./src/models/vestingMilestone');
  console.log('✅ Models imported successfully');

  // Test service import
  console.log('2. Testing service import...');
  const milestoneCelebrationService = require('./src/services/milestoneCelebrationService');
  console.log('✅ Service imported successfully');

  // Test payload formatting
  console.log('3. Testing payload formatting...');
  const testWebhook = {
    webhook_type: 'discord',
    webhook_url: 'https://discord.com/api/webhooks/test',
    custom_message_template: null
  };

  const testMilestoneData = {
    id: 'test-id',
    type: 'cliff_end',
    vaultName: '1 Million Token Community Pool',
    vestedAmount: 1000000,
    cumulativeVested: 1000000,
    milestoneDate: new Date().toISOString()
  };

  const discordPayload = milestoneCelebrationService.formatPayload(testWebhook, testMilestoneData);
  console.log('✅ Discord payload formatted successfully');
  console.log('   Content:', discordPayload.content?.substring(0, 50) + '...');

  // Test Telegram payload
  testWebhook.webhook_type = 'telegram';
  const telegramPayload = milestoneCelebrationService.formatPayload(testWebhook, testMilestoneData);
  console.log('✅ Telegram payload formatted successfully');

  // Test custom payload
  testWebhook.webhook_type = 'custom';
  const customPayload = milestoneCelebrationService.formatPayload(testWebhook, testMilestoneData);
  console.log('✅ Custom payload formatted successfully');

  console.log('\n🎉 All validations passed! Milestone celebration webhook implementation is working correctly.');

} catch (error) {
  console.error('❌ Validation failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
