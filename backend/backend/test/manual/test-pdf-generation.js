const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/database/connection');
const { Vault, Beneficiary, SubSchedule, Organization, Token } = require('./src/models');

// Test data for PDF generation
const testVaultData = {
  id: '00000000-0000-0000-0000-000000000001',
  address: '0x1234567890123456789012345678901234567890',
  name: 'Team Vesting Vault',
  token_address: '0x9876543210987654321098765432109876543210',
  owner_address: '0xowner111111111111111111111111111111111111111',
  total_amount: '1000000.000000000000000000',
  org_id: null,
  created_at: new Date(),
  updated_at: new Date()
};

const testTokenData = {
  address: '0x9876543210987654321098765432109876543210',
  symbol: 'TOKEN',
  name: 'Test Token',
  decimals: 18
};

const testBeneficiaryData = {
  id: '00000000-0000-0000-0000-000000000002',
  vault_id: testVaultData.id,
  address: '0xbeneficiary111111111111111111111111111111111111',
  email: 'beneficiary@example.com',
  total_allocated: '1000000.000000000000000000',
  total_withdrawn: '0.000000000000000000',
  created_at: new Date(),
  updated_at: new Date()
};

const testSubScheduleData = {
  id: '00000000-0000-0000-0000-000000000003',
  vault_id: testVaultData.id,
  top_up_amount: '1000000.000000000000000000',
  created_at: new Date(),
  cliff_duration: 90 * 24 * 60 * 60, // 90 days in seconds
  cliff_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  vesting_start_date: new Date(),
  vesting_duration: 365 * 24 * 60 * 60, // 365 days in seconds
  start_timestamp: new Date(),
  end_timestamp: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  transaction_hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  block_number: '12345678',
  amount_withdrawn: '0.000000000000000000',
  amount_released: '0.000000000000000000',
  is_active: true
};

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    await sequelize.authenticate();
    
    // Clean up existing test data
    await SubSchedule.destroy({ where: { vault_id: testVaultData.id } });
    await Beneficiary.destroy({ where: { vault_id: testVaultData.id } });
    await Vault.destroy({ where: { id: testVaultData.id } });
    await Token.destroy({ where: { address: testTokenData.address } });
    
    // Create test token
    await Token.create(testTokenData);
    console.log('✅ Test token created');
    
    // Create test vault
    await Vault.create(testVaultData);
    console.log('✅ Test vault created');
    
    // Create test beneficiary
    await Beneficiary.create(testBeneficiaryData);
    console.log('✅ Test beneficiary created');
    
    // Create test sub-schedule
    await SubSchedule.create(testSubScheduleData);
    console.log('✅ Test sub-schedule created');
    
    console.log('✅ All test data created successfully');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error.message);
    throw error;
  }
}

async function testPDFEndpoint() {
  const baseURL = process.env.BASE_URL || 'http://localhost:4000';
  
  console.log('\n🧪 Testing PDF generation endpoint...');
  
  try {
    const response = await axios.get(`${baseURL}/api/vault/${testVaultData.id}/agreement.pdf`, {
      responseType: 'arraybuffer'
    });
    
    console.log('✅ PDF endpoint response:', response.status);
    console.log('📄 Content-Type:', response.headers['content-type']);
    console.log('📎 Content-Disposition:', response.headers['content-disposition']);
    console.log('📊 Content-Length:', response.headers['content-length'], 'bytes');
    
    // Save PDF to file for inspection
    const pdfPath = path.join(__dirname, 'test-vesting-agreement.pdf');
    fs.writeFileSync(pdfPath, response.data);
    console.log('💾 PDF saved to:', pdfPath);
    
    // Verify PDF content
    const pdfBuffer = Buffer.from(response.data);
    if (pdfBuffer.length > 1000) { // Basic size check
      console.log('✅ PDF appears to be generated successfully');
    } else {
      console.log('⚠️  PDF seems too small, may be an error');
    }
    
    // Check PDF header
    if (pdfBuffer.toString('ascii', 0, 4) === '%PDF') {
      console.log('✅ PDF header is valid');
    } else {
      console.log('❌ Invalid PDF header');
    }
    
  } catch (error) {
    console.error('❌ PDF endpoint test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testEdgeCases() {
  const baseURL = process.env.BASE_URL || 'http://localhost:4000';
  
  console.log('\n🧪 Testing edge cases...');
  
  try {
    // Test with non-existent vault ID
    console.log('1. Testing non-existent vault ID...');
    try {
      await axios.get(`${baseURL}/api/vault/00000000-0000-0000-0000-000000000000/agreement.pdf`);
      console.log('❌ Should have failed with non-existent vault');
    } catch (error) {
      console.log('✅ Non-existent vault correctly rejected:', error.response?.status);
    }
    
    // Test with invalid UUID format
    console.log('2. Testing invalid UUID format...');
    try {
      await axios.get(`${baseURL}/api/vault/invalid-uuid/agreement.pdf`);
      console.log('❌ Should have failed with invalid UUID');
    } catch (error) {
      console.log('✅ Invalid UUID correctly rejected:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Edge case test failed:', error.message);
  }
}

async function testPDFServiceDirectly() {
  console.log('\n🧪 Testing PDF service directly...');
  
  try {
    const pdfService = require('./src/services/pdfService');
    
    // Get vault data from database
    const vault = await Vault.findOne({
      where: { id: testVaultData.id },
      include: [
        {
          model: Organization,
          as: 'organization',
          required: false
        },
        {
          model: Beneficiary,
          required: true
        },
        {
          model: SubSchedule,
          required: false
        }
      ]
    });

    const token = await Token.findOne({
      where: { address: testVaultData.token_address }
    });

    const vaultData = {
      vault: vault.get({ plain: true }),
      beneficiaries: vault.Beneficiaries || [],
      subSchedules: vault.SubSchedules || [],
      organization: vault.organization,
      token: token
    };

    // Generate PDF buffer
    const pdfBuffer = await pdfService.generateVestingAgreement(vaultData);
    
    console.log('✅ PDF generated successfully');
    console.log('📊 PDF size:', pdfBuffer.length, 'bytes');
    
    // Save direct PDF for comparison
    const directPdfPath = path.join(__dirname, 'test-vesting-agreement-direct.pdf');
    fs.writeFileSync(directPdfPath, pdfBuffer);
    console.log('💾 Direct PDF saved to:', directPdfPath);
    
  } catch (error) {
    console.error('❌ Direct PDF service test failed:', error.message);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    await SubSchedule.destroy({ where: { vault_id: testVaultData.id } });
    await Beneficiary.destroy({ where: { vault_id: testVaultData.id } });
    await Vault.destroy({ where: { id: testVaultData.id } });
    await Token.destroy({ where: { address: testTokenData.address } });
    
    // Remove generated PDF files
    const files = [
      'test-vesting-agreement.pdf',
      'test-vesting-agreement-direct.pdf'
    ];
    
    files.forEach(file => {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️  Removed:', file);
      }
    });
    
    console.log('✅ Test data cleaned up');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting PDF Generation Tests...\n');
  
  try {
    await setupTestData();
    await testPDFServiceDirectly();
    await testPDFEndpoint();
    await testEdgeCases();
    await cleanupTestData();
    
    console.log('\n🎉 All PDF generation tests completed successfully!');
    console.log('\n📝 API Usage:');
    console.log('GET /api/vault/:id/agreement.pdf');
    console.log('Response: PDF file stream');
    console.log('Headers:');
    console.log('  Content-Type: application/pdf');
    console.log('  Content-Disposition: attachment; filename="vesting-agreement-{vault-address}.pdf"');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { 
  setupTestData, 
  testPDFEndpoint, 
  testEdgeCases, 
  testPDFServiceDirectly, 
  cleanupTestData 
};
