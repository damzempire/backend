/**
 * RPC Retry Utility
 * Handles retries for RPC calls with exponential backoff.
 */

async function executeRpcWithRetry(rpcCall, label = 'RPC Call', maxRetries = 5, initialDelay = 1000) {
  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await rpcCall();
    } catch (error) {
      lastError = error;
      const statusCode = error.response ? error.response.status : 'N/A';
      console.warn(`[${label}] Attempt ${attempt} failed with status ${statusCode}: ${error.message}`);

      // Don't retry on certain errors (e.g., 400 Bad Request, 401 Unauthorized, 403 Forbidden)
      if (error.response && [400, 401, 403].includes(error.response.status)) {
        throw error;
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  console.error(`[${label}] All ${maxRetries} attempts failed.`);
  throw lastError;
}

module.exports = {
  executeRpcWithRetry
};
