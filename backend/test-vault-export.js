const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testVaultExport() {
  console.log('Testing Vault CSV Export Endpoint...\n');

  try {
    // Test with a sample vault ID (you may need to adjust this)
    const testVaultId = 'sample-vault-id'; // Replace with actual vault ID or address
    
    console.log(`Testing export for vault: ${testVaultId}`);
    console.log(`Endpoint: ${API_BASE_URL}/api/vault/${testVaultId}/export\n`);

    // Make request to export endpoint
    const response = await axios.get(`${API_BASE_URL}/api/vault/${testVaultId}/export`, {
      responseType: 'stream'
    });

    console.log('Response Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Disposition:', response.headers['content-disposition']);

    // Save the CSV to a file for inspection
    const outputPath = path.join(__dirname, `vault-export-${Date.now()}.csv`);
    const writer = fs.createWriteStream(outputPath);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`\nCSV saved to: ${outputPath}`);

    // Read and display first few lines of the CSV
    const csvContent = fs.readFileSync(outputPath, 'utf8');
    const lines = csvContent.split('\n').slice(0, 5); // Show first 5 lines
    
    console.log('\nFirst 5 lines of CSV:');
    lines.forEach((line, index) => {
      console.log(`${index + 1}: ${line}`);
    });

    console.log('\n✅ Vault export test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing vault export:', error.message);
    
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    
    process.exit(1);
  }
}

// Test with invalid vault ID
async function testInvalidVaultExport() {
  console.log('\nTesting with invalid vault ID...');
  
  try {
    const invalidVaultId = 'invalid-vault-id';
    await axios.get(`${API_BASE_URL}/api/vault/${invalidVaultId}/export`, {
      responseType: 'stream'
    });
    
    console.log('❌ Expected error for invalid vault ID');
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log('✅ Correctly handled invalid vault ID');
    } else {
      console.log('⚠️  Unexpected error:', error.message);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Vault Export Tests\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  
  await testVaultExport();
  await testInvalidVaultExport();
  
  console.log('\n🎉 All tests completed!');
}

// Check if server is running
async function checkServerHealth() {
  try {
    await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the server first:');
    console.log('   cd backend && npm run dev');
    console.log('   or');
    console.log('   cd backend && npm start');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServerHealth();
  if (serverRunning) {
    await runTests();
  } else {
    process.exit(1);
  }
})();
