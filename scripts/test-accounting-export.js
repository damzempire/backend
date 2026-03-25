#!/usr/bin/env node

/**
 * Test script for Xero/QuickBooks CSV export functionality
 * Usage: node scripts/test-accounting-export.js [org-id]
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testAccountingExport(organizationId) {
  console.log('=== Testing Accounting Export Functionality ===');
  console.log(`Organization ID: ${organizationId}`);
  console.log(`API Base URL: ${BASE_URL}`);
  console.log('');

  try {
    // Test 1: Get export summary
    console.log('1. Testing export summary endpoint...');
    const summaryResponse = await axios.get(`${BASE_URL}/api/org/${organizationId}/export/summary`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }
    });
    
    console.log('✅ Export summary response:');
    console.log(JSON.stringify(summaryResponse.data, null, 2));
    console.log('');

    // Test 2: Xero export
    console.log('2. Testing Xero export endpoint...');
    const xeroResponse = await axios.get(`${BASE_URL}/api/org/${organizationId}/export/xero`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      responseType: 'text'
    });
    
    console.log('✅ Xero export generated successfully');
    console.log('CSV preview (first 500 characters):');
    console.log(xeroResponse.data.substring(0, 500) + '...');
    console.log('');

    // Test 3: QuickBooks export
    console.log('3. Testing QuickBooks export endpoint...');
    const quickbooksResponse = await axios.get(`${BASE_URL}/api/org/${organizationId}/export/quickbooks`, {
      params: {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      responseType: 'text'
    });
    
    console.log('✅ QuickBooks export generated successfully');
    console.log('CSV preview (first 500 characters):');
    console.log(quickbooksResponse.data.substring(0, 500) + '...');
    console.log('');

    // Test 4: Error handling - invalid organization
    console.log('4. Testing error handling with invalid organization...');
    try {
      await axios.get(`${BASE_URL}/api/org/invalid-org-id/export/xero`);
      console.log('❌ Expected error was not thrown');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly handled invalid organization ID');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 5: Error handling - invalid date range
    console.log('5. Testing error handling with invalid date range...');
    try {
      await axios.get(`${BASE_URL}/api/org/${organizationId}/export/xero`, {
        params: {
          startDate: '2024-12-31',
          endDate: '2024-01-01' // End date before start date
        }
      });
      console.log('❌ Expected error was not thrown');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly handled invalid date range');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('');
    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('');
    console.error('❌ Test failed:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const organizationId = args[0];

if (!organizationId) {
  console.log('Usage: node scripts/test-accounting-export.js <organization-id>');
  console.log('');
  console.log('Example: node scripts/test-accounting-export.js 12345678-1234-1234-1234-123456789012');
  process.exit(1);
}

// Run tests
testAccountingExport(organizationId);
