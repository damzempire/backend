const fs = require('fs');
const reportService = require('./src/services/reportService');
const { sequelize } = require('./src/database/connection');
const { ClaimsHistory } = require('./src/models');

// Uncomment the following block to mock data if DB is unavailable
/*
ClaimsHistory.findAll = async () => {
  return [
    {
      user_address: '0x1234567890123456789012345678901234567890',
      token_address: '0xTokenAddress',
      amount_claimed: '100.50',
      claim_timestamp: new Date()
    },
    {
      user_address: '0x0987654321098765432109876543210987654321',
      token_address: '0xTokenAddress',
      amount_claimed: '200.00',
      claim_timestamp: new Date()
    }
  ];
};
*/

async function testReport() {
  try {
    // If not mocking, ensure DB connection
    if (ClaimsHistory.findAll.toString().includes('native code') || !ClaimsHistory.findAll.toString().includes('return [')) {
       await sequelize.authenticate();
       console.log('Database connected.');
    }

    console.log('Generating report...');
    const pdfBuffer = await reportService.generateMonthlyClaimsPDF();
    
    fs.writeFileSync('test-report.pdf', pdfBuffer);
    console.log('Report generated and saved to test-report.pdf');
    
    process.exit(0);
  } catch (error) {
    console.error('Error generating report:', error);
    process.exit(1);
  }
}

testReport();
