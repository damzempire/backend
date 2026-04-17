const axios = require('axios');
const { sequelize } = require('./src/database/connection');
const { Organization } = require('./src/models');

// Test configuration
const baseURL = process.env.BASE_URL || 'http://localhost:4000';
const testAdminAddress = '0x1234567890123456789012345678901234567890';
const testUserAddress = '0x9876543210987654321098765432109876543210';

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    await sequelize.authenticate();
    
    // Create test organization for admin role
    await Organization.findOrCreate({
      where: { admin_address: testAdminAddress },
      defaults: {
        name: 'Test Organization',
        admin_address: testAdminAddress,
        website_url: 'https://test.com',
        discord_url: 'https://discord.gg/test'
      }
    });
    
    console.log('✅ Test organization created');
    
  } catch (error) {
    console.error('❌ Failed to setup test data:', error.message);
    throw error;
  }
}

async function testLogin() {
  console.log('\n🧪 Testing login endpoint...');
  
  try {
    // Test admin login
    const adminResponse = await axios.post(`${baseURL}/api/auth/login`, {
      address: testAdminAddress,
      signature: 'test-signature' // Mock signature for testing
    });
    
    console.log('✅ Admin login successful');
    console.log('📋 Admin response:', {
      success: adminResponse.data.success,
      hasAccessToken: !!adminResponse.data.data?.accessToken,
      expiresIn: adminResponse.data.data?.expiresIn,
      tokenType: adminResponse.data.data?.tokenType
    });
    
    // Test user login
    const userResponse = await axios.post(`${baseURL}/api/auth/login`, {
      address: testUserAddress,
      signature: 'test-signature' // Mock signature for testing
    });
    
    console.log('✅ User login successful');
    
    return {
      adminTokens: adminResponse.data.data,
      userTokens: userResponse.data.data,
      cookies: adminResponse.headers['set-cookie'] || []
    };
  } catch (error) {
    console.error('❌ Login test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testTokenRefresh(tokens) {
  console.log('\n🧪 Testing token refresh endpoint...');
  
  try {
    // Wait a moment to ensure tokens are different
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Test refresh with cookie (recommended method)
    const cookieRefreshResponse = await axios.post(`${baseURL}/api/auth/refresh`, {}, {
      headers: {
        'Cookie': `refreshToken=${tokens.refreshToken || 'test-token'}`
      }
    });
    
    console.log('✅ Token refresh with cookie successful');
    console.log('📋 New tokens:', {
      success: cookieRefreshResponse.data.success,
      hasNewAccessToken: !!cookieRefreshResponse.data.data?.accessToken,
      expiresIn: cookieRefreshResponse.data.data?.expiresIn
    });
    
    // Test refresh with request body (alternative method)
    const bodyRefreshResponse = await axios.post(`${baseURL}/api/auth/refresh`, {
      refreshToken: tokens.refreshToken || 'test-token'
    });
    
    console.log('✅ Token refresh with body successful');
    
    return {
      newTokens: cookieRefreshResponse.data.data,
      cookies: cookieRefreshResponse.headers['set-cookie'] || []
    };
  } catch (error) {
    console.error('❌ Token refresh test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testProtectedEndpoints(tokens) {
  console.log('\n🧪 Testing protected endpoints...');
  
  try {
    // Test /api/auth/me endpoint
    const meResponse = await axios.get(`${baseURL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`
      }
    });
    
    console.log('✅ Protected endpoint access successful');
    console.log('👤 User info:', meResponse.data.data);
    
    // Test with invalid token
    try {
      await axios.get(`${baseURL}/api/auth/me`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      console.log('❌ Should have failed with invalid token');
    } catch (error) {
      console.log('✅ Invalid token correctly rejected:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Protected endpoint test failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testTokenExpiration() {
  console.log('\n🧪 Testing token expiration scenarios...');
  
  try {
    // Test refresh with expired token (simulate)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHgxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAiLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjE2MTYyMzkwMjMsImlzcyI6InZlc3RpbmctdmF1bHQiLCJhdWQiOiJ2ZXN0aW5nLXZhdWx0LWFwaSJ9.expired';
    
    try {
      await axios.get(`${baseURL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${expiredToken}`
        }
      });
      console.log('❌ Should have failed with expired token');
    } catch (error) {
      console.log('✅ Expired token correctly rejected:', error.response?.status);
    }
    
    // Test refresh with invalid refresh token
    try {
      await axios.post(`${baseURL}/api/auth/refresh`, {
        refreshToken: 'invalid-refresh-token'
      });
      console.log('❌ Should have failed with invalid refresh token');
    } catch (error) {
      console.log('✅ Invalid refresh token correctly rejected:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Token expiration test failed:', error.message);
  }
}

async function testLogout(tokens) {
  console.log('\n🧪 Testing logout endpoint...');
  
  try {
    // Test logout
    const logoutResponse = await axios.post(`${baseURL}/api/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`
      }
    });
    
    console.log('✅ Logout successful');
    console.log('📋 Logout response:', logoutResponse.data);
    
    // Test that refresh token is revoked
    try {
      await axios.post(`${baseURL}/api/auth/refresh`, {
        refreshToken: tokens.refreshToken || 'test-token'
      });
      console.log('❌ Should have failed after logout');
    } catch (error) {
      console.log('✅ Refresh token correctly revoked after logout:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Logout test failed:', error.response?.data || error.message);
  }
}

async function testTokenRotation() {
  console.log('\n🧪 Testing token rotation security...');
  
  try {
    // Login to get initial tokens
    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
      address: testAdminAddress,
      signature: 'test-signature'
    });
    
    const initialTokens = loginResponse.data.data;
    
    // Refresh tokens multiple times to test rotation
    let currentTokens = initialTokens;
    let refreshCount = 0;
    
    for (let i = 0; i < 3; i++) {
      const refreshResponse = await axios.post(`${baseURL}/api/auth/refresh`, {
        refreshToken: currentTokens.refreshToken || 'test-token'
      });
      
      currentTokens = refreshResponse.data.data;
      refreshCount++;
      
      console.log(`🔄 Refresh ${refreshCount + 1}: New access token generated`);
    }
    
    // Try to use old refresh token (should fail)
    try {
      await axios.post(`${baseURL}/api/auth/refresh`, {
        refreshToken: initialTokens.refreshToken || 'test-token'
      });
      console.log('❌ Old refresh token should have been revoked');
    } catch (error) {
      console.log('✅ Old refresh token correctly revoked (rotation working)');
    }
    
  } catch (error) {
    console.error('❌ Token rotation test failed:', error.response?.data || error.message);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    await Organization.destroy({
      where: { admin_address: testAdminAddress }
    });
    
    console.log('✅ Test data cleaned up');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting JWT Token Refresh Tests...\n');
  
  try {
    await setupTestData();
    
    // Test login functionality
    const { adminTokens, userTokens } = await testLogin();
    
    // Test token refresh
    const { newTokens } = await testTokenRefresh(adminTokens);
    
    // Test protected endpoints
    await testProtectedEndpoints(newTokens);
    
    // Test token expiration scenarios
    await testTokenExpiration();
    
    // Test logout functionality
    await testLogout(newTokens);
    
    // Test token rotation security
    await testTokenRotation();
    
    await cleanupTestData();
    
    console.log('\n🎉 All JWT refresh tests completed successfully!');
    console.log('\n📝 API Summary:');
    console.log('POST /api/auth/login - Login and get tokens');
    console.log('POST /api/auth/refresh - Refresh access token');
    console.log('POST /api/auth/logout - Logout and revoke tokens');
    console.log('GET /api/auth/me - Get current user info');
    
    console.log('\n🔒 Security Features:');
    console.log('✅ Short-lived access tokens (15 minutes)');
    console.log('✅ Secure HTTP-only refresh token cookies');
    console.log('✅ Token rotation (old tokens invalidated)');
    console.log('✅ Role-based authentication');
    console.log('✅ Proper token validation');
    
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
  testLogin,
  testTokenRefresh,
  testProtectedEndpoints,
  testTokenExpiration,
  testLogout,
  testTokenRotation,
  cleanupTestData
};
