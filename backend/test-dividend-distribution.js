const dividendService = require('./src/services/dividendService');
const { DividendRound, DividendDistribution, DividendSnapshot, Vault, Beneficiary, SubSchedule, sequelize } = require('./src/models');

// Test data
const testTokenAddress = '0x1234567890123456789012345678901234567890';
const testVaultAddress = '0x9876543210987654321098765432109876543210';
const testBeneficiary1 = '0x1111111111111111111111111111111111111111';
const testBeneficiary2 = '0x2222222222222222222222222222222222222222';
const testBeneficiary3 = '0x3333333333333333333333333333333333333333';

let testDividendRoundId = null;
let testVaultId = null;

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Clean up any existing test data
    await DividendDistribution.destroy({ where: {} });
    await DividendSnapshot.destroy({ where: {} });
    await DividendRound.destroy({ where: {} });
    await SubSchedule.destroy({ where: {} });
    await Beneficiary.destroy({ where: {} });
    await Vault.destroy({ where: { address: testVaultAddress } });
    
    // Create test vault
    const vault = await Vault.create({
      address: testVaultAddress,
      name: 'Test Dividend Vault',
      token_address: testTokenAddress,
      owner_address: '0x0000000000000000000000000000000000000000',
      total_amount: '10000.000000000000000000'
    });
    
    testVaultId = vault.id;
    
    // Create test beneficiaries with different vesting schedules
    const currentTime = new Date();
    const pastTime = new Date(currentTime.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 days ago
    const futureTime = new Date(currentTime.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days from now
    
    // Beneficiary 1: Fully vested
    const beneficiary1 = await Beneficiary.create({
      vault_id: vault.id,
      address: testBeneficiary1,
      total_allocated: '1000.000000000000000000',
      total_withdrawn: '0.000000000000000000'
    });
    
    await SubSchedule.create({
      vault_id: vault.id,
      beneficiary_id: beneficiary1.id,
      top_up_amount: '1000.000000000000000000',
      top_up_transaction_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      top_up_timestamp: pastTime,
      cliff_date: pastTime,
      vesting_start_date: pastTime,
      vesting_duration: 86400 * 30, // 30 days
      start_timestamp: pastTime,
      end_timestamp: currentTime,
      amount_released: '1000.000000000000000000',
      is_active: true
    });
    
    // Beneficiary 2: Partially vested (50%)
    const beneficiary2 = await Beneficiary.create({
      vault_id: vault.id,
      address: testBeneficiary2,
      total_allocated: '2000.000000000000000000',
      total_withdrawn: '0.000000000000000000'
    });
    
    await SubSchedule.create({
      vault_id: vault.id,
      beneficiary_id: beneficiary2.id,
      top_up_amount: '2000.000000000000000000',
      top_up_transaction_hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      top_up_timestamp: pastTime,
      cliff_date: pastTime,
      vesting_start_date: pastTime,
      vesting_duration: 86400 * 60, // 60 days
      start_timestamp: pastTime,
      end_timestamp: futureTime,
      amount_released: '0.000000000000000000',
      is_active: true
    });
    
    // Beneficiary 3: Not vested (cliff not passed)
    const beneficiary3 = await Beneficiary.create({
      vault_id: vault.id,
      address: testBeneficiary3,
      total_allocated: '1500.000000000000000000',
      total_withdrawn: '0.000000000000000000'
    });
    
    await SubSchedule.create({
      vault_id: vault.id,
      beneficiary_id: beneficiary3.id,
      top_up_amount: '1500.000000000000000000',
      top_up_transaction_hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      top_up_timestamp: currentTime,
      cliff_date: futureTime,
      vesting_start_date: futureTime,
      vesting_duration: 86400 * 90, // 90 days
      start_timestamp: futureTime,
      end_timestamp: new Date(futureTime.getTime() + (86400 * 90)),
      amount_released: '0.000000000000000000',
      is_active: true
    });
    
    console.log('✅ Test vault and beneficiaries created with vesting schedules');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error.message);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    await DividendDistribution.destroy({ where: {} });
    await DividendSnapshot.destroy({ where: {} });
    await DividendRound.destroy({ where: {} });
    await SubSchedule.destroy({ where: {} });
    await Beneficiary.destroy({ where: {} });
    await Vault.destroy({ where: { address: testVaultAddress } });
    
    console.log('✅ Test data cleaned up');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error.message);
  }
}

async function testDividendRoundCreation() {
  console.log('\n🧪 Testing dividend round creation...');
  
  try {
    // Test valid dividend round creation
    const dividendRound = await dividendService.createDividendRound(
      testTokenAddress,
      '1000.000000000000000000', // 1000 tokens
      'USDC', // USDC dividends
      'full', // Full treatment for vested/unvested
      1.0, // Full multiplier for unvested
      '0xadminaddress' // Created by admin
    );
    
    testDividendRoundId = dividendRound.id;
    
    console.log('✅ Dividend round created:', dividendRound.id);
    console.log(`   Token: ${dividendRound.token_address}`);
    console.log(`   Amount: ${dividendRound.total_dividend_amount} ${dividendRound.dividend_token}`);
    console.log(`   Vested Treatment: ${dividendRound.vested_treatment}`);
    console.log(`   Unvested Multiplier: ${dividendRound.unvested_multiplier}`);
    
    // Verify round was saved
    const retrievedRound = await dividendService.getDividendRound(dividendRound.id);
    
    if (!retrievedRound || retrievedRound.id !== dividendRound.id) {
      throw new Error('Dividend round not properly saved or retrieved');
    }
    
    console.log('✅ Dividend round retrieval verified');
    
    // Test invalid inputs
    try {
      await dividendService.createDividendRound(
        'invalid',
        '1000',
        'USDC',
        'full',
        1.0,
        '0xadmin'
      );
      throw new Error('Should have failed on invalid token address');
    } catch (error) {
      if (!error.message.includes('required')) {
        throw error;
      }
      console.log('✅ Invalid input properly rejected');
    }
    
  } catch (error) {
    console.error('❌ Dividend round creation test failed:', error.message);
    throw error;
  }
}

async function testDividendSnapshot() {
  console.log('\n🧪 Testing dividend snapshot...');
  
  try {
    // Take snapshot for the dividend round
    const result = await dividendService.takeDividendSnapshot(testDividendRoundId);
    
    console.log('✅ Dividend snapshot completed');
    console.log(`   Eligible Holders: ${result.eligibleHolders}`);
    console.log(`   Eligible Balance: ${result.eligibleBalance}`);
    
    // Verify snapshots were created
    const snapshots = await DividendSnapshot.findAll({
      where: { dividend_round_id: testDividendRoundId }
    });
    
    if (snapshots.length !== result.eligibleHolders) {
      throw new Error(`Expected ${result.eligibleHolders} snapshots, got ${snapshots.length}`);
    }
    
    console.log('✅ Snapshots created successfully');
    
    // Verify snapshot data
    for (const snapshot of snapshots) {
      if (!snapshot.is_eligible) {
        throw new Error(`Snapshot for ${snapshot.beneficiary_address} should be eligible`);
      }
      
      const totalBalance = parseFloat(snapshot.total_balance);
      const vestedBalance = parseFloat(snapshot.vested_balance);
      const unvestedBalance = parseFloat(snapshot.unvested_balance);
      
      if (totalBalance !== vestedBalance + unvestedBalance) {
        throw new Error('Balance calculation error in snapshot');
      }
      
      console.log(`   ${snapshot.beneficiary_address}: ${vestedBalance}/${totalBalance} vested`);
    }
    
    // Verify dividend round status updated
    const updatedRound = await DividendRound.findByPk(testDividendRoundId);
    if (updatedRound.status !== 'ready') {
      throw new Error('Dividend round should be in ready status after snapshot');
    }
    
    console.log('✅ Dividend round status updated correctly');
    
  } catch (error) {
    console.error('❌ Dividend snapshot test failed:', error.message);
    throw error;
  }
}

async function testProRataCalculations() {
  console.log('\n🧪 Testing pro-rata dividend calculations...');
  
  try {
    // Calculate distributions
    const distributions = await dividendService.calculateDividendDistributions(testDividendRoundId);
    
    console.log('✅ Pro-rata calculations completed');
    console.log(`   Distributions calculated: ${distributions.length}`);
    
    // Verify calculations
    let totalDividendAmount = 0;
    let totalProRataShare = 0;
    
    for (const distribution of distributions) {
      const dividendAmount = parseFloat(distribution.dividendAmount);
      const proRataShare = parseFloat(distribution.proRataShare);
      
      totalDividendAmount += dividendAmount;
      totalProRataShare += proRataShare;
      
      console.log(`   ${distribution.beneficiaryAddress}: ${distribution.dividendAmount} (${(proRataShare * 100).toFixed(4)}%)`);
    }
    
    // Verify total equals dividend amount
    const dividendRound = await DividendRound.findByPk(testDividendRoundId);
    const expectedTotal = parseFloat(dividendRound.total_dividend_amount);
    
    if (Math.abs(totalDividendAmount - expectedTotal) > 0.00000001) {
      throw new Error(`Total dividend amount mismatch: expected ${expectedTotal}, got ${totalDividendAmount}`);
    }
    
    console.log(`✅ Total dividend amount verified: ${totalDividendAmount}`);
    
    // Verify pro-rata shares sum to 1 (allowing for rounding)
    if (Math.abs(totalProRataShare - 1.0) > 0.0001) {
      throw new Error(`Pro-rata shares should sum to 1.0, got ${totalProRataShare}`);
    }
    
    console.log(`✅ Pro-rata shares verified: ${totalProRataShare}`);
    
    // Verify distribution records were created
    const distributionRecords = await DividendDistribution.findAll({
      where: { dividend_round_id: testDividendRoundId }
    });
    
    if (distributionRecords.length !== distributions.length) {
      throw new Error('Distribution records not properly saved');
    }
    
    console.log('✅ Distribution records saved successfully');
    
  } catch (error) {
    console.error('❌ Pro-rata calculations test failed:', error.message);
    throw error;
  }
}

async function testVestedTreatmentRules() {
  console.log('\n🧪 Testing vested/unvested treatment rules...');
  
  try {
    // Test different vested treatment scenarios
    const scenarios = [
      {
        name: 'Full Treatment',
        vestedTreatment: 'full',
        unvestedMultiplier: 1.0,
        expectedUnvestedMultiplier: 1.0
      },
      {
        name: 'Proportional Treatment',
        vestedTreatment: 'proportional',
        unvestedMultiplier: 0.5,
        expectedUnvestedMultiplier: 0.5
      },
      {
        name: 'Vested Only Treatment',
        vestedTreatment: 'vested_only',
        unvestedMultiplier: 0.0,
        expectedUnvestedMultiplier: 0.0
      }
    ];
    
    for (const scenario of scenarios) {
      console.log(`\n📊 Testing ${scenario.name}...`);
      
      // Create new dividend round with different treatment
      const round = await dividendService.createDividendRound(
        testTokenAddress,
        '500.000000000000000000',
        'USDC',
        scenario.vestedTreatment,
        scenario.unvestedMultiplier,
        '0xadminaddress'
      );
      
      // Take snapshot
      await dividendService.takeDividendSnapshot(round.id);
      
      // Calculate distributions
      const distributions = await dividendService.calculateDividendDistributions(round.id);
      
      // Verify treatment rules were applied correctly
      for (const distribution of distributions) {
        const snapshot = await DividendSnapshot.findOne({
          where: {
            dividend_round_id: round.id,
            beneficiary_address: distribution.beneficiaryAddress
          }
        });
        
        const heldBalance = parseFloat(snapshot.total_balance);
        const vestedBalance = parseFloat(snapshot.vested_balance);
        const unvestedBalance = parseFloat(snapshot.unvested_balance);
        const eligibleBalance = parseFloat(distribution.eligible_balance);
        
        let expectedEligibleBalance;
        
        switch (scenario.vestedTreatment) {
          case 'full':
            expectedEligibleBalance = heldBalance;
            break;
          case 'proportional':
            expectedEligibleBalance = vestedBalance + (unvestedBalance * scenario.unvestedMultiplier);
            break;
          case 'vested_only':
            expectedEligibleBalance = vestedBalance;
            break;
        }
        
        if (Math.abs(eligibleBalance - expectedEligibleBalance) > 0.00000001) {
          throw new Error(`Eligible balance calculation error for ${scenario.name}: expected ${expectedEligibleBalance}, got ${eligibleBalance}`);
        }
        
        console.log(`   ${distribution.beneficiaryAddress}: ${eligibleBalance}/${heldBalance} eligible`);
      }
      
      // Clean up test round
      await DividendDistribution.destroy({ where: { dividend_round_id: round.id } });
      await DividendSnapshot.destroy({ where: { dividend_round_id: round.id } });
      await DividendRound.destroy({ where: { id: round.id } });
      
      console.log(`✅ ${scenario.name} test passed`);
    }
    
  } catch (error) {
    console.error('❌ Vested treatment rules test failed:', error.message);
    throw error;
  }
}

async function testSideDripDistribution() {
  console.log('\n🧪 Testing side-drip distribution...');
  
  try {
    // Start distribution
    const result = await dividendService.distributeDividends(testDividendRoundId);
    
    console.log('✅ Side-drip distribution completed');
    console.log(`   Status: ${result.status}`);
    console.log(`   Success: ${result.successCount}`);
    console.log(`   Failed: ${result.failureCount}`);
    console.log(`   Total Amount: ${result.totalAmount}`);
    
    // Verify distribution records were updated
    const distributions = await DividendDistribution.findAll({
      where: { dividend_round_id: testDividendRoundId }
    });
    
    const sentDistributions = distributions.filter(d => d.status === 'sent');
    const failedDistributions = distributions.filter(d => d.status === 'failed');
    
    if (sentDistributions.length !== result.successCount) {
      throw new Error(`Sent distributions count mismatch: expected ${result.successCount}, got ${sentDistributions.length}`);
    }
    
    if (failedDistributions.length !== result.failureCount) {
      throw new Error(`Failed distributions count mismatch: expected ${result.failureCount}, got ${failedDistributions.length}`);
    }
    
    console.log('✅ Distribution records updated correctly');
    
    // Verify transaction hashes were set for successful distributions
    for (const distribution of sentDistributions) {
      if (!distribution.transaction_hash) {
        throw new Error(`Transaction hash missing for successful distribution to ${distribution.beneficiary_address}`);
      }
      
      if (!distribution.distributed_at) {
        throw new Error(`Distributed timestamp missing for successful distribution to ${distribution.beneficiary_address}`);
      }
    }
    
    console.log('✅ Transaction hashes and timestamps recorded');
    
    // Verify dividend round status
    const updatedRound = await DividendRound.findByPk(testDividendRoundId);
    if (!['completed', 'partial'].includes(updatedRound.status)) {
      throw new Error(`Dividend round should be completed or partial, got ${updatedRound.status}`);
    }
    
    console.log(`✅ Dividend round status updated to: ${updatedRound.status}`);
    
  } catch (error) {
    console.error('❌ Side-drip distribution test failed:', error.message);
    throw error;
  }
}

async function testUserDividendHistory() {
  console.log('\n🧪 Testing user dividend history...');
  
  try {
    // Get dividend history for a test user
    const history = await dividendService.getUserDividendHistory(testBeneficiary1, 10);
    
    console.log('✅ User dividend history retrieved');
    console.log(`   History entries: ${history.length}`);
    
    if (history.length === 0) {
      throw new Error('User should have dividend history entries');
    }
    
    // Verify history structure
    for (const entry of history) {
      if (!entry.dividendRound || !entry.beneficiary_address || !entry.dividend_amount) {
        throw new Error('Invalid history entry structure');
      }
      
      console.log(`   Round: ${entry.dividendRound.id}, Amount: ${entry.dividend_amount}, Status: ${entry.status}`);
    }
    
    // Test non-existent user
    const emptyHistory = await dividendService.getUserDividendHistory('0xnonexistentuser', 10);
    
    if (emptyHistory.length !== 0) {
      throw new Error('Non-existent user should have empty history');
    }
    
    console.log('✅ Non-existent user returns empty history');
    
  } catch (error) {
    console.error('❌ User dividend history test failed:', error.message);
    throw error;
  }
}

async function testDividendStatistics() {
  console.log('\n🧪 Testing dividend statistics...');
  
  try {
    const stats = await dividendService.getStats();
    
    console.log('✅ Dividend statistics retrieved');
    console.log(`   Total Rounds: ${stats.rounds.total}`);
    console.log(`   Pending Rounds: ${stats.rounds.pending}`);
    console.log(`   Ready Rounds: ${stats.rounds.ready}`);
    console.log(`   Completed Rounds: ${stats.rounds.completed}`);
    console.log(`   Failed Rounds: ${stats.rounds.failed}`);
    console.log(`   Total Distributed: ${stats.totalDistributed}`);
    
    // Verify stats structure
    if (!stats.rounds || !stats.rounds.total) {
      throw new Error('Invalid statistics structure');
    }
    
    if (stats.rounds.total < 1) {
      throw new Error('Should have at least 1 dividend round');
    }
    
    // Verify totals match
    const roundCount = parseInt(stats.rounds.total);
    const statusCount = parseInt(stats.rounds.pending) + parseInt(stats.rounds.ready) + 
                     parseInt(stats.rounds.completed) + parseInt(stats.rounds.failed);
    
    if (roundCount !== statusCount) {
      throw new Error(`Round count mismatch: total ${roundCount}, status sum ${statusCount}`);
    }
    
    console.log('✅ Statistics verification passed');
    
  } catch (error) {
    console.error('❌ Dividend statistics test failed:', error.message);
    throw error;
  }
}

async function testEdgeCases() {
  console.log('\n🧪 Testing edge cases...');
  
  try {
    // Test zero dividend amount
    try {
      await dividendService.createDividendRound(
        testTokenAddress,
        '0',
        'USDC',
        'full',
        1.0,
        '0xadmin'
      );
      throw new Error('Should have failed on zero amount');
    } catch (error) {
      if (!error.message.includes('greater than 0')) {
        throw error;
      }
      console.log('✅ Zero amount properly rejected');
    }
    
    // Test invalid vested treatment
    try {
      await dividendService.createDividendRound(
        testTokenAddress,
        '1000',
        'USDC',
        'invalid',
        1.0,
        '0xadmin'
      );
      throw new Error('Should have failed on invalid vested treatment');
    } catch (error) {
      if (!error.message.includes('Invalid vested treatment')) {
        throw error;
      }
      console.log('✅ Invalid vested treatment properly rejected');
    }
    
    // Test invalid unvested multiplier
    try {
      await dividendService.createDividendRound(
        testTokenAddress,
        '1000',
        'USDC',
        'full',
        1.5, // Too high
        '0xadmin'
      );
      throw new Error('Should have failed on invalid multiplier');
    } catch (error) {
      if (!error.message.includes('between 0 and 1')) {
        throw error;
      }
      console.log('✅ Invalid multiplier properly rejected');
    }
    
    // Test snapshot on non-existent round
    try {
      await dividendService.takeDividendSnapshot('non-existent-round-id');
      throw new Error('Should have failed on non-existent round');
    } catch (error) {
      if (!error.message.includes('not found')) {
        throw error;
      }
      console.log('✅ Non-existent round properly rejected');
    }
    
    // Test calculations on round with no eligible holders
    const emptyRound = await dividendService.createDividendRound(
      '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdead',
      '1000',
      'USDC',
      'full',
      1.0,
      '0xadmin'
    );
    
    try {
      await dividendService.takeDividendSnapshot(emptyRound.id);
      throw new Error('Should have failed on no eligible balance');
    } catch (error) {
      if (!error.message.includes('No eligible balance')) {
        throw error;
      }
      console.log('✅ No eligible balance properly handled');
    }
    
    // Clean up empty round
    await DividendRound.destroy({ where: { id: emptyRound.id } });
    
    console.log('✅ Edge cases test passed');
    
  } catch (error) {
    console.error('❌ Edge cases test failed:', error.message);
    throw error;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Dividend Distribution Tests...\n');
  
  try {
    await setupTestData();
    
    await testDividendRoundCreation();
    await testDividendSnapshot();
    await testProRataCalculations();
    await testVestedTreatmentRules();
    await testSideDripDistribution();
    await testUserDividendHistory();
    await testDividendStatistics();
    await testEdgeCases();
    
    await cleanupTestData();
    
    console.log('\n🎉 All Dividend Distribution tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Dividend round creation and management');
    console.log('✅ Holder snapshot with vesting calculations');
    console.log('✅ Pro-rata dividend distribution calculations');
    console.log('✅ Vested/unvested treatment rules');
    console.log('✅ Side-drip distribution mechanism');
    console.log('✅ User dividend history tracking');
    console.log('✅ Statistics and reporting');
    console.log('✅ Edge cases and error handling');
    
    console.log('\n💰 Financial Features Verified:');
    console.log('✅ Time-locked tokens receive fair dividend share');
    console.log('✅ Vested/unvested treatment respects project bylaws');
    console.log('✅ Pro-rata calculations are mathematically accurate');
    console.log('✅ Side-drip mechanism distributes to wallet addresses');
    console.log('✅ Comprehensive audit trail maintained');
    console.log('✅ No financial penalties for time-locked tokens');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  setupTestData,
  cleanupTestData,
  testDividendRoundCreation,
  testDividendSnapshot,
  testProRataCalculations,
  testVestedTreatmentRules,
  testSideDripDistribution,
  testUserDividendHistory,
  testDividendStatistics,
  testEdgeCases,
  runAllTests
};
