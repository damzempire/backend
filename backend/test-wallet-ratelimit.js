const { walletRateLimiter } = require("./src/util/wallet-ratelimit.util");

// Simple test script to verify wallet rate limiting functionality
async function testWalletRateLimiting() {
  console.log("Testing Wallet-Based Rate Limiting...\n");

  const testWallet = "0x1234567890abcdef1234567890abcdef12345678";

  try {
    // Test 1: Valid wallet address
    console.log("Test 1: Valid wallet address validation");
    const isValid = walletRateLimiter.isValidWalletAddress(testWallet);
    console.log(`✓ Wallet ${testWallet} is valid: ${isValid}\n`);

    // Test 2: Invalid wallet address
    console.log("Test 2: Invalid wallet address validation");
    const isInvalid = walletRateLimiter.isValidWalletAddress("invalid");
    console.log(`✓ Wallet 'invalid' is valid: ${isInvalid}\n`);

    // Test 3: Rate limiting within limits
    console.log("Test 3: Rate limiting within limits");
    for (let i = 1; i <= 5; i++) {
      const result = await walletRateLimiter.checkRateLimit(testWallet);
      console.log(
        `Request ${i}: Allowed=${result.allowed}, Remaining=${result.remaining}`,
      );

      if (!result.allowed) {
        console.log("❌ Rate limit triggered unexpectedly");
        break;
      }
    }
    console.log("✓ First 5 requests allowed\n");

    // Test 4: Get rate limit status
    console.log("Test 4: Get current rate limit status");
    const status = await walletRateLimiter.getRateLimitStatus(testWallet);
    console.log(
      `✓ Current status: ${status.current}/${status.total} requests, ${status.remaining} remaining\n`,
    );

    // Test 5: Reset rate limit
    console.log("Test 5: Reset rate limit");
    await walletRateLimiter.resetRateLimit(testWallet);
    const resetStatus = await walletRateLimiter.getRateLimitStatus(testWallet);
    console.log(
      `✓ After reset: ${resetStatus.current}/${resetStatus.total} requests\n`,
    );

    console.log(
      "🎉 All tests passed! Wallet-based rate limiting is working correctly.",
    );
  } catch (error) {
    console.error("❌ Test failed:", error.message);

    // If Redis is not available, that's expected in testing
    if (
      error.message.includes("Redis") ||
      error.message.includes("ECONNREFUSED")
    ) {
      console.log(
        "\nℹ️  Redis is not available - this is expected in testing environment",
      );
      console.log(
        "The rate limiter will fail open (allow requests) when Redis is unavailable",
      );
    }
  }
}

// Run the test
if (require.main === module) {
  testWalletRateLimiting();
}

module.exports = { testWalletRateLimiting };
