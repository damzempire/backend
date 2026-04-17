// Unit test for vault export service
const vaultExportService = require('./src/services/vaultExportService');

// Mock vault data for testing
const mockVaultData = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  address: '0x1234567890123456789012345678901234567890',
  name: 'Test Vault "Special"',
  token_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  owner_address: '0x9876543210987654321098765432109876543210',
  total_amount: '1000000.500000000000000000',
  org_id: '456e7890-e89b-12d3-a456-426614174000',
  created_at: new Date('2024-01-15T10:30:00Z'),
  updated_at: new Date('2024-01-20T15:45:00Z'),
  organization: {
    id: '456e7890-e89b-12d3-a456-426614174000',
    name: 'Test Organization "Inc."'
  },
  beneficiaries: [
    {
      id: '789e0123-e89b-12d3-a456-426614174000',
      address: '0x1111111111111111111111111111111111111111',
      total_allocated: '500000.250000000000000000',
      total_withdrawn: '100000.000000000000000000',
      created_at: new Date('2024-01-16T08:00:00Z'),
      updated_at: new Date('2024-01-18T12:30:00Z')
    },
    {
      id: '890e1234-e89b-12d3-a456-426614174000',
      address: '0x2222222222222222222222222222222222222222',
      total_allocated: '500000.250000000000000000',
      total_withdrawn: '0.000000000000000000',
      created_at: new Date('2024-01-16T08:05:00Z'),
      updated_at: new Date('2024-01-16T08:05:00Z')
    }
  ]
};

function testCSVHeaders() {
  console.log('1. Testing CSV Headers Generation:');
  
  const headers = vaultExportService.generateCSVHeaders();
  const expectedHeaders = 'Vault ID,Vault Address,Vault Name,Token Address,Owner Address,Total Amount,Organization ID,Organization Name,Created At,Updated At,Beneficiary ID,Beneficiary Address,Total Allocated,Total Withdrawn,Beneficiary Created At,Beneficiary Updated At\n';
  
  if (headers === expectedHeaders) {
    console.log('✅ CSV headers generated correctly');
  } else {
    console.log('❌ CSV headers mismatch');
    console.log('Expected:', expectedHeaders.trim());
    console.log('Actual:  ', headers.trim());
  }
  console.log('');
}

function testVaultToCSV() {
  console.log('2. Testing Vault to CSV Conversion:');
  
  const csvData = vaultExportService.vaultToCSV(mockVaultData);
  const lines = csvData.split('\n');
  
  console.log(`Generated ${lines.length} CSV rows for ${mockVaultData.beneficiaries.length} beneficiaries`);
  
  // Check if we have the right number of rows (should match beneficiaries count)
  if (lines.length === mockVaultData.beneficiaries.length) {
    console.log('✅ Correct number of CSV rows generated');
  } else {
    console.log('❌ Incorrect number of CSV rows');
  }
  
  // Check first row (first beneficiary)
  const firstRow = lines[0];
  const columns = firstRow.split(',');
  
  console.log('First row columns:');
  console.log(`  Vault ID: ${columns[0]}`);
  console.log(`  Vault Name: ${columns[2]}`);
  console.log(`  Beneficiary Address: ${columns[10]}`);
  console.log(`  Total Allocated: ${columns[11]}`);
  
  // Verify quote escaping
  if (columns[2].includes('"Test Vault ""Special"""')) {
    console.log('✅ Quote escaping working correctly');
  } else {
    console.log('❌ Quote escaping not working');
  }
  
  console.log('');
}

function testVaultToCSVNoBeneficiaries() {
  console.log('3. Testing Vault with No Beneficiaries:');
  
  const vaultNoBeneficiaries = { ...mockVaultData, beneficiaries: [] };
  const csvData = vaultExportService.vaultToCSV(vaultNoBeneficiaries);
  const lines = csvData.split('\n');
  
  if (lines.length === 1) {
    console.log('✅ Single row generated for vault with no beneficiaries');
  } else {
    console.log('❌ Incorrect number of rows for vault with no beneficiaries');
  }
  
  // Check that beneficiary fields are empty
  const firstRow = lines[0];
  const columns = firstRow.split(',');
  const beneficiaryFieldsEmpty = columns.slice(10).every(field => field === '');
  
  if (beneficiaryFieldsEmpty) {
    console.log('✅ Beneficiary fields are empty as expected');
  } else {
    console.log('❌ Beneficiary fields are not empty');
  }
  
  console.log('');
}

function testSpecialCharacters() {
  console.log('4. Testing Special Characters in CSV:');
  
  const vaultWithSpecialChars = {
    ...mockVaultData,
    name: 'Test "Vault" with, commas\nand newlines',
    organization: {
      ...mockVaultData.organization,
      name: 'Org "Name" with, special chars'
    }
  };
  
  const csvData = vaultExportService.vaultToCSV(vaultWithSpecialChars);
  const lines = csvData.split('\n');
  const firstRow = lines[0];
  const columns = firstRow.split(',');
  
  // Check that special characters are properly escaped
  const vaultNameEscaped = columns[2].includes('"Test ""Vault"" with, commas\nand newlines"');
  const orgNameEscaped = columns[7].includes('"Org ""Name"" with, special chars"');
  
  if (vaultNameEscaped && orgNameEscaped) {
    console.log('✅ Special characters properly escaped');
  } else {
    console.log('❌ Special characters not properly escaped');
    console.log('Vault Name:', columns[2]);
    console.log('Org Name:', columns[7]);
  }
  
  console.log('');
}

// Run all tests
async function runTests() {
  console.log('🧪 Running Vault Export Service Unit Tests\n');
  
  try {
    testCSVHeaders();
    testVaultToCSV();
    testVaultToCSVNoBeneficiaries();
    testSpecialCharacters();
    
    console.log('🎉 All unit tests completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the tests
runTests();
