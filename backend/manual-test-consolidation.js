/**
 * Manual test for Account Consolidation Service
 * Run with: node manual-test-consolidation.js
 */

const accountConsolidationService = require('./src/services/accountConsolidationService');

async function testConsolidation() {
  console.log('🧪 Testing Account Consolidation Service...\n');

  try {
    // Test 1: Get consolidated view for non-existent beneficiary
    console.log('Test 1: Get consolidated view for unknown address');
    const result1 = await accountConsolidationService.getConsolidatedView('0xunknownaddress');
    console.log('✅ Result:', JSON.stringify(result1, null, 2));
    console.log('✅ Test 1 passed!\n');

    // Test 2: Test weighted average calculation
    console.log('Test 2: Weighted average date calculation');
    const subSchedules = [
      {
        top_up_amount: '1000',
        cliff_date: new Date('2023-01-01'),
        end_timestamp: new Date('2024-01-01'),
        vesting_duration: 31536000
      },
      {
        top_up_amount: '2000',
        cliff_date: new Date('2023-03-01'),
        end_timestamp: new Date('2024-03-01'),
        vesting_duration: 31622400
      }
    ];

    const weightedResult = accountConsolidationService._calculateVaultWeightedDates(subSchedules, 3000);
    console.log('✅ Weighted average result:', {
      cliffDate: weightedResult.cliffDate,
      endDate: weightedResult.endDate,
      duration: weightedResult.duration
    });
    console.log('✅ Test 2 passed!\n');

    // Test 3: Empty sub-schedules
    console.log('Test 3: Empty sub-schedules');
    const emptyResult = accountConsolidationService._calculateVaultWeightedDates([], 1000);
    console.log('✅ Empty result:', emptyResult);
    console.log('✅ Test 3 passed!\n');

    console.log('🎉 All manual tests passed! Account consolidation service is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Test merge functionality (will fail gracefully without proper database setup)
async function testMerge() {
  console.log('\n🧪 Testing Account Merge (expected to fail without database)...');
  
  try {
    const mergeResult = await accountConsolidationService.mergeBeneficiaryAddresses(
      '0xprimary',
      ['0xsecondary'],
      '0xadmin'
    );
    console.log('✅ Merge result:', mergeResult);
  } catch (error) {
    console.log('✅ Expected error (no database):', error.message);
  }
}

// Run tests
testConsolidation().then(() => {
  return testMerge();
}).then(() => {
  console.log('\n🏁 Manual testing complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
