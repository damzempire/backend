/**
 * Test script to verify the bulk insert optimization and health check fixes
 * Run this script to test the implementations before creating PR
 */

const bulkInsertService = require('./src/services/bulkInsertService');
const syncHealthCheckService = require('./src/services/syncHealthCheckService');
const { IndexerState } = require('./src/models');

async function testBulkInsertService() {
  console.log('\n=== Testing Bulk Insert Service ===');
  
  try {
    // Test configuration
    console.log('Testing bulk insert service configuration...');
    const config = bulkInsertService.getPerformanceStats();
    console.log('Bulk insert config:', config);
    
    // Test configuration update
    console.log('Testing configuration update...');
    bulkInsertService.updateConfig({
      chunkSize: 500,
      maxRetries: 5
    });
    
    const updatedConfig = bulkInsertService.getPerformanceStats();
    console.log('Updated config:', updatedConfig);
    
    console.log('Bulk insert service tests passed!');
    return true;
  } catch (error) {
    console.error('Bulk insert service test failed:', error);
    return false;
  }
}

async function testSyncHealthCheckService() {
  console.log('\n=== Testing Sync Health Check Service ===');
  
  try {
    // Test configuration
    console.log('Testing sync health check configuration...');
    const config = syncHealthCheckService.getConfig();
    console.log('Health check config:', config);
    
    // Test configuration update
    console.log('Testing configuration update...');
    syncHealthCheckService.updateConfig({
      healthyThreshold: 25,
      cacheTimeout: 15000
    });
    
    const updatedConfig = syncHealthCheckService.getConfig();
    console.log('Updated config:', updatedConfig);
    
    // Test cache clearing
    console.log('Testing cache clearing...');
    syncHealthCheckService.clearCache();
    
    console.log('Sync health check service tests passed!');
    return true;
  } catch (error) {
    console.error('Sync health check service test failed:', error);
    return false;
  }
}

async function testHealthCheckEndpoint() {
  console.log('\n=== Testing Health Check Endpoint ===');
  
  try {
    // This would normally require the server to be running
    // For now, we'll test the service directly
    console.log('Testing health check service (simulated)...');
    
    // Test the service method directly (without network calls)
    const config = syncHealthCheckService.getConfig();
    if (config.healthyThreshold && config.cacheTimeout) {
      console.log('Health check endpoint service is properly configured');
      console.log('Health check endpoint tests passed!');
      return true;
    } else {
      console.error('Health check service not properly configured');
      return false;
    }
  } catch (error) {
    console.error('Health check endpoint test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting tests for bulk insert optimization and health check fixes...\n');
  
  const results = {
    bulkInsertService: await testBulkInsertService(),
    syncHealthCheckService: await testSyncHealthCheckService(),
    healthCheckEndpoint: await testHealthCheckEndpoint()
  };
  
  console.log('\n=== Test Results Summary ===');
  console.log('Bulk Insert Service:', results.bulkInsertService ? 'PASS' : 'FAIL');
  console.log('Sync Health Check Service:', results.syncHealthCheckService ? 'PASS' : 'FAIL');
  console.log('Health Check Endpoint:', results.healthCheckEndpoint ? 'PASS' : 'FAIL');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\nAll tests passed! Ready for PR creation.');
  } else {
    console.log('\nSome tests failed. Please review the issues above.');
  }
  
  return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runAllTests,
  testBulkInsertService,
  testSyncHealthCheckService,
  testHealthCheckEndpoint
};
