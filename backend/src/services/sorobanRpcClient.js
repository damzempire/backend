const axios = require('axios');
const Sentry = require('@sentry/node');

class SorobanRpcClient {
  constructor(rpcUrl, options = {}) {
    this.rpcUrl = rpcUrl;
    this.timeout = options.timeout || 10000;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * Make RPC call to Soroban network
   * @param {string} method - RPC method name
   * @param {Object} params - RPC parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} RPC response
   */
  async call(method, params = {}, options = {}) {
    const requestId = Date.now();
    const requestBody = {
      jsonrpc: "2.0",
      id: requestId,
      method,
      params
    };

    const requestOptions = {
      timeout: options.timeout || this.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await axios.post(this.rpcUrl, requestBody, requestOptions);
      
      if (response.data.error) {
        throw new Error(`RPC Error: ${response.data.error.message} (Code: ${response.data.error.code})`);
      }

      return response.data.result;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText} - ${error.response.data?.message || error.message}`);
      } else if (error.request) {
        throw new Error('Network error: Unable to reach Soroban RPC server');
      } else {
        throw error;
      }
    }
  }

  /**
   * Get latest ledger information
   * @returns {Promise<Object>} Latest ledger info
   */
  async getLatestLedger() {
    return this.call('getLatestLedger');
  }

  /**
   * Get events for a specific ledger range
   * @param {number} startLedger - Start ledger sequence (inclusive)
   * @param {number} endLedger - End ledger sequence (inclusive)
   * @param {Object} filters - Event filters
   * @returns {Promise<Array>} Array of events
   */
  async getEvents(startLedger, endLedger, filters = {}) {
    const params = {
      startLedger,
      endLedger,
      ...filters
    };

    return this.call('getEvents', params);
  }

  /**
   * Get transaction information
   * @param {string} transactionHash - Transaction hash
   * @returns {Promise<Object>} Transaction info
   */
  async getTransaction(transactionHash) {
    return this.call('getTransaction', { hash: transactionHash });
  }

  /**
   * Get ledger entry
   * @param {Object} key - Ledger entry key
   * @returns {Promise<Object>} Ledger entry data
   */
  async getLedgerEntry(key) {
    return this.call('getLedgerEntry', key);
  }

  /**
   * Make RPC call with retry logic
   * @param {string} method - RPC method name
   * @param {Object} params - RPC parameters
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} RPC response
   */
  async callWithRetry(method, params = {}, options = {}) {
    let lastError;
    const maxRetries = options.maxRetries || this.maxRetries;
    const retryDelay = options.retryDelay || this.retryDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.call(method, params, options);
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        if (this.isNonRetryableError(error)) {
          throw error;
        }

        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.warn(`RPC call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);
          await this.delay(delay);
        }
      }
    }

    // Log final failure to Sentry
    Sentry.captureException(lastError, {
      tags: { service: 'soroban-rpc-client', method },
      extra: { params, attempts: maxRetries + 1 }
    });

    throw lastError;
  }

  /**
   * Check if error is non-retryable
   * @param {Error} error - Error to check
   * @returns {boolean} Whether error is non-retryable
   */
  isNonRetryableError(error) {
    const message = error.message.toLowerCase();
    
    // Don't retry on validation errors, not found, etc.
    const nonRetryablePatterns = [
      'invalid parameter',
      'not found',
      'invalid hash',
      'invalid ledger',
      'validation error'
    ];

    return nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Delay helper
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for RPC endpoint
   * @returns {Promise<boolean>} Whether RPC is healthy
   */
  async healthCheck() {
    try {
      await this.getLatestLedger();
      return true;
    } catch (error) {
      console.error('Soroban RPC health check failed:', error.message);
      return false;
    }
  }

  /**
   * Get network information
   * @returns {Promise<Object>} Network info
   */
  async getNetwork() {
    return this.call('getNetwork');
  }

  /**
   * Simulate transaction
   * @param {Object} transaction - Transaction to simulate
   * @returns {Promise<Object>} Simulation result
   */
  async simulateTransaction(transaction) {
    return this.call('simulateTransaction', transaction);
  }
}

module.exports = SorobanRpcClient;
