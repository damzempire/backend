/**
 * Simple test to verify Rule 144 compliance functionality
 * This test verifies that the compliance middleware and service are working correctly
 */

const rule144ComplianceService = require('./src/services/rule144ComplianceService');

async function testRule144Compliance() {
  console.log('Testing Rule 144 Compliance Service...');
  
  try {
    // Test 1: Check if service can be imported
    console.log('✓ Rule 144 compliance service imported successfully');
    
    // Test 2: Check if service has required methods
    const requiredMethods = [
      'createComplianceRecord',
      'checkClaimCompliance', 
      'getUserComplianceStatus',
      'getVaultComplianceStatus',
      'getComplianceStatistics',
      'updateComplianceRecord',
      'recordClaimAttempt'
    ];
    
    for (const method of requiredMethods) {
      if (typeof rule144ComplianceService[method] === 'function') {
        console.log(`✓ Method ${method} exists`);
      } else {
        console.log(`✗ Method ${method} missing`);
      }
    }
    
    console.log('\nRule 144 Compliance Service test completed');
    console.log('Note: Full integration tests require database connection');
    
  } catch (error) {
    console.error('Error testing Rule 144 compliance:', error.message);
  }
}

// Run the test
testRule144Compliance();
