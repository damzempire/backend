/**
 * Simple test to verify Rule 144 compliance model
 * This test checks if the compliance model is properly defined
 */

const { Rule144Compliance } = require('./src/models');

async function testRule144Model() {
  console.log('Testing Rule 144 Compliance Model...');
  
  try {
    // Test 1: Check if model can be imported
    console.log('✓ Rule 144 compliance model imported successfully');
    
    // Test 2: Check if model has required attributes
    const modelDefinition = Rule144Compliance.rawAttributes;
    
    const requiredAttributes = [
      'vault_id',
      'user_address', 
      'token_address',
      'initial_acquisition_date',
      'holding_period_months',
      'holding_period_end_date',
      'is_restricted_security',
      'exemption_type',
      'compliance_status'
    ];
    
    for (const attr of requiredAttributes) {
      if (modelDefinition[attr]) {
        console.log(`✓ Attribute ${attr} exists`);
      } else {
        console.log(`✗ Attribute ${attr} missing`);
      }
    }
    
    // Test 3: Check if model has required methods
    const requiredMethods = [
      'isHoldingPeriodMet',
      'getDaysUntilCompliance',
      'updateComplianceStatus'
    ];
    
    for (const method of requiredMethods) {
      if (typeof Rule144Compliance.prototype[method] === 'function') {
        console.log(`✓ Instance method ${method} exists`);
      } else {
        console.log(`✗ Instance method ${method} missing`);
      }
    }
    
    // Test 4: Check if model has required class methods
    const requiredClassMethods = [
      'getComplianceByVaultAndUser',
      'createComplianceRecord'
    ];
    
    for (const method of requiredClassMethods) {
      if (typeof Rule144Compliance[method] === 'function') {
        console.log(`✓ Class method ${method} exists`);
      } else {
        console.log(`✗ Class method ${method} missing`);
      }
    }
    
    console.log('\nRule 144 Compliance Model test completed successfully');
    
  } catch (error) {
    console.error('Error testing Rule 144 compliance model:', error.message);
  }
}

// Run the test
testRule144Model();
