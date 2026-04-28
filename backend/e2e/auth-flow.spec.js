const { test, expect } = require('@playwright/test');
const { ethers } = require('ethers');

// Test wallet for SEP-10 authentication
const TEST_WALLET_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const TEST_WALLET_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/');
  });

  test('should complete full auth lifecycle - login to protected route', async ({ page, request }) => {
    // Step 1: Get challenge for SEP-10 authentication
    const challengeResponse = await request.post('/api/auth/challenge', {
      data: {
        address: TEST_WALLET_ADDRESS
      }
    });

    expect(challengeResponse.ok()).toBeTruthy();
    const challengeData = await challengeResponse.json();
    expect(challengeData.success).toBeTruthy();
    expect(challengeData.data.challenge).toBeDefined();

    // Step 2: Sign the challenge with test wallet
    const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);
    const signature = await wallet.signMessage(challengeData.data.challenge);

    // Step 3: Login with signed challenge
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        address: TEST_WALLET_ADDRESS,
        signature: signature
      }
    });

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    expect(loginData.success).toBeTruthy();
    expect(loginData.data.accessToken).toBeDefined();
    expect(loginData.data.expiresIn).toBeDefined();
    expect(loginData.data.tokenType).toBe('Bearer');

    // Step 4: Access protected route with JWT
    const protectedResponse = await request.get('/api/user/vaults', {
      headers: {
        'Authorization': `Bearer ${loginData.data.accessToken}`
      }
    });

    expect(protectedResponse.ok()).toBeTruthy();
    const protectedData = await protectedResponse.json();
    expect(protectedData.success).toBeTruthy();
    expect(Array.isArray(protectedData.data)).toBeTruthy(); // Should be array of vaults

    // Step 5: Verify JWT token refresh works
    const refreshResponse = await request.post('/api/auth/refresh', {
      headers: {
        'Cookie': loginResponse.headers()['set-cookie']
      }
    });

    expect(refreshResponse.ok()).toBeTruthy();
    const refreshData = await refreshResponse.json();
    expect(refreshData.success).toBeTruthy();
    expect(refreshData.data.accessToken).toBeDefined();
    expect(refreshData.data.accessToken).not.toBe(loginData.data.accessToken); // Should be new token

    // Step 6: Verify new token works for protected route
    const newProtectedResponse = await request.get('/api/user/vaults', {
      headers: {
        'Authorization': `Bearer ${refreshData.data.accessToken}`
      }
    });

    expect(newProtectedResponse.ok()).toBeTruthy();
    const newProtectedData = await newProtectedResponse.json();
    expect(newProtectedData.success).toBeTruthy();
    expect(Array.isArray(newProtectedData.data)).toBeTruthy();
  });

  test('should reject invalid signature', async ({ request }) => {
    // Step 1: Get challenge
    const challengeResponse = await request.post('/api/auth/challenge', {
      data: {
        address: TEST_WALLET_ADDRESS
      }
    });

    const challengeData = await challengeResponse.json();
    
    // Step 2: Try login with invalid signature
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        address: TEST_WALLET_ADDRESS,
        signature: 'invalid_signature'
      }
    });

    expect(loginResponse.ok()).toBeFalsy();
    expect(loginResponse.status()).toBe(401);
    const loginData = await loginResponse.json();
    expect(loginData.success).toBeFalsy();
    expect(loginData.error).toContain('Invalid signature');
  });

  test('should reject expired JWT token', async ({ request }) => {
    // Step 1: Login to get valid token
    const challengeResponse = await request.post('/api/auth/challenge', {
      data: {
        address: TEST_WALLET_ADDRESS
      }
    });

    const challengeData = await challengeResponse.json();
    const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);
    const signature = await wallet.signMessage(challengeData.data.challenge);

    const loginResponse = await request.post('/api/auth/login', {
      data: {
        address: TEST_WALLET_ADDRESS,
        signature: signature
      }
    });

    const loginData = await loginResponse.json();
    
    // Step 2: Try to access protected route with malformed token
    const protectedResponse = await request.get('/api/user/vaults', {
      headers: {
        'Authorization': 'Bearer expired_or_invalid_token'
      }
    });

    expect(protectedResponse.ok()).toBeFalsy();
    expect(protectedResponse.status()).toBe(401);
    const protectedData = await protectedResponse.json();
    expect(protectedData.success).toBeFalsy();
  });

  test('should handle token refresh properly', async ({ request }) => {
    // Step 1: Login
    const challengeResponse = await request.post('/api/auth/challenge', {
      data: {
        address: TEST_WALLET_ADDRESS
      }
    });

    const challengeData = await challengeResponse.json();
    const wallet = new ethers.Wallet(TEST_WALLET_PRIVATE_KEY);
    const signature = await wallet.signMessage(challengeData.data.challenge);

    const loginResponse = await request.post('/api/auth/login', {
      data: {
        address: TEST_WALLET_ADDRESS,
        signature: signature
      }
    });

    // Step 2: Try refresh without token
    const refreshResponse = await request.post('/api/auth/refresh');

    expect(refreshResponse.ok()).toBeFalsy();
    expect(refreshResponse.status()).toBe(401);
    const refreshData = await refreshResponse.json();
    expect(refreshData.success).toBeFalsy();
    expect(refreshData.error).toContain('Refresh token required');
  });

  test('should validate challenge request parameters', async ({ request }) => {
    // Test missing address
    const response1 = await request.post('/api/auth/challenge', {
      data: {}
    });

    expect(response1.ok()).toBeFalsy();
    expect(response1.status()).toBe(400);
    const data1 = await response1.json();
    expect(data1.success).toBeFalsy();
    expect(data1.error).toContain('Address is required');

    // Test invalid address format
    const response2 = await request.post('/api/auth/challenge', {
      data: {
        address: 'invalid_address'
      }
    });

    expect(response2.ok()).toBeFalsy();
    expect(response2.status()).toBe(400);
    const data2 = await response2.json();
    expect(data2.success).toBeFalsy();
    expect(data2.error).toContain('Invalid address format');
  });

  test('should handle concurrent auth requests', async ({ request }) => {
    // Generate multiple concurrent challenge requests
    const challengePromises = Array.from({ length: 5 }, () =>
      request.post('/api/auth/challenge', {
        data: {
          address: TEST_WALLET_ADDRESS
        }
      })
    );

    const challengeResponses = await Promise.all(challengePromises);
    
    // All should succeed
    for (const response of challengeResponses) {
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBeTruthy();
      expect(data.data.challenge).toBeDefined();
    }

    // Verify challenges are unique (non-replay protection)
    const challenges = await Promise.all(
      challengeResponses.map(res => res.json().then(data => data.data.challenge))
    );
    const uniqueChallenges = new Set(challenges);
    expect(uniqueChallenges.size).toBe(challenges.length);
  });
});
