// Test script for audit logging functionality
const auditLogger = require('./src/services/auditLogger');
const adminService = require('./src/services/adminService');

async function testAuditLogging() {
  console.log('Testing Audit Logging Functionality...\n');
  
  try {
    // Test 1: Create a vault
    console.log('1. Testing CREATE action:');
    const createResult = await adminService.createVault(
      '0x1234567890123456789012345678901234567890',
      '0x9876543210987654321098765432109876543210',
      { name: 'Test Vault', type: 'vesting' }
    );
    console.log('Result:', createResult);
    console.log('');

    // Test 2: Revoke access
    console.log('2. Testing REVOKE action:');
    const revokeResult = await adminService.revokeAccess(
      '0x1234567890123456789012345678901234567890',
      '0x9876543210987654321098765432109876543210',
      'Violation of terms'
    );
    console.log('Result:', revokeResult);
    console.log('');

    // Test 3: Transfer vault
    console.log('3. Testing TRANSFER action:');
    const transferResult = await adminService.transferVault(
      '0x1234567890123456789012345678901234567890',
      '0x9876543210987654321098765432109876543210',
      '0x1111111111111111111111111111111111111111'
    );
    console.log('Result:', transferResult);
    console.log('');

    // Test 4: Get audit logs
    console.log('4. Testing audit log retrieval:');
    const logs = adminService.getAuditLogs(10);
    console.log('Audit Logs:');
    logs.logs.forEach((log, index) => {
      console.log(`${index + 1}: ${log}`);
    });
    console.log('');

    // Test 5: Direct audit logger test
    console.log('5. Testing direct audit logger:');
    auditLogger.logAction(
      '0x2222222222222222222222222222222222222222',
      'CUSTOM_ACTION',
      '0x3333333333333333333333333333333333333333'
    );
    console.log('Custom action logged successfully');
    console.log('');

    console.log('✅ All audit logging tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuditLogging();
