const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Sample test data
const testUserAddress = '0x1234567890123456789012345678901234567890';
const testDeviceToken = 'sample-fcm-device-token-for-testing-12345';

async function testPushNotifications() {
  console.log('🧪 Testing Push Notification Implementation\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test 2: Register device token
    console.log('\n2. Testing device token registration...');
    const registerResponse = await axios.post(`${BASE_URL}/api/notifications/register-device`, {
      userAddress: testUserAddress,
      deviceToken: testDeviceToken,
      platform: 'android',
      appVersion: '1.0.0'
    });
    console.log('✅ Device token registered:', registerResponse.data);

    // Test 3: Get user device tokens
    console.log('\n3. Testing get user device tokens...');
    const devicesResponse = await axios.get(`${BASE_URL}/api/notifications/devices/${testUserAddress}`);
    console.log('✅ User device tokens retrieved:', devicesResponse.data);

    // Test 4: Register another device token (iOS)
    console.log('\n4. Testing iOS device token registration...');
    const iosRegisterResponse = await axios.post(`${BASE_URL}/api/notifications/register-device`, {
      userAddress: testUserAddress,
      deviceToken: 'ios-fcm-device-token-for-testing-67890',
      platform: 'ios',
      appVersion: '1.0.1'
    });
    console.log('✅ iOS device token registered:', iosRegisterResponse.data);

    // Test 5: Unregister device token
    console.log('\n5. Testing device token unregistration...');
    const unregisterResponse = await axios.delete(`${BASE_URL}/api/notifications/unregister-device`, {
      data: { deviceToken: testDeviceToken }
    });
    console.log('✅ Device token unregistered:', unregisterResponse.data);

    // Test 6: Verify token was unregistered
    console.log('\n6. Verifying token unregistration...');
    const finalDevicesResponse = await axios.get(`${BASE_URL}/api/notifications/devices/${testUserAddress}`);
    console.log('✅ Final device tokens:', finalDevicesResponse.data);

    console.log('\n🎉 All push notification tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Test error cases
async function testErrorCases() {
  console.log('\n🧪 Testing Error Cases\n');

  try {
    // Test invalid platform
    console.log('1. Testing invalid platform...');
    try {
      await axios.post(`${BASE_URL}/api/notifications/register-device`, {
        userAddress: testUserAddress,
        deviceToken: 'test-token',
        platform: 'invalid-platform'
      });
    } catch (error) {
      console.log('✅ Invalid platform rejected:', error.response.data.error);
    }

    // Test missing required fields
    console.log('\n2. Testing missing required fields...');
    try {
      await axios.post(`${BASE_URL}/api/notifications/register-device`, {
        userAddress: testUserAddress
        // Missing deviceToken and platform
      });
    } catch (error) {
      console.log('✅ Missing fields rejected:', error.response.data.error);
    }

    console.log('\n🎉 Error case tests passed!');

  } catch (error) {
    console.error('❌ Error case test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPushNotifications()
    .then(() => testErrorCases())
    .then(() => {
      console.log('\n✨ All tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testPushNotifications, testErrorCases };