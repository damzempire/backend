const axios = require('axios');
const externalServiceManager = require('./externalServiceManager');
const TracingUtils = require('../tracing/tracingUtils');

class ResilientApiService {
  constructor() {
    this.setupFallbackData();
  }

  /**
   * Setup fallback data for different services
   */
  setupFallbackData() {
    // Fallback data for DEX Oracle
    externalServiceManager.setFallbackData('dex_oracle', (context) => ({
      price: context.tokenPrice || 1.0,
      timestamp: new Date().toISOString(),
      source: 'fallback',
      symbol: context.symbol || 'UNKNOWN'
    }));

    // Fallback data for SumSub KYC
    externalServiceManager.setFallbackData('sumsub', (context) => ({
      status: 'pending',
      reviewStatus: 'init',
      createdAt: new Date().toISOString(),
      applicantId: context.applicantId || 'unknown',
      source: 'fallback'
    }));

    // Fallback data for Stellar RPC
    externalServiceManager.setFallbackData('stellar_rpc', (context) => ({
      error: 'Stellar RPC unavailable',
      fallback: true,
      timestamp: new Date().toISOString()
    }));

    // Fallback data for email service
    externalServiceManager.setFallbackData('email_service', (context) => ({
      messageId: `fallback-${Date.now()}`,
      status: 'queued',
      source: 'fallback'
    }));
  }

  /**
   * Make a resilient HTTP GET request
   * @param {string} serviceName - Name of the service
   * @param {string} url - URL to request
   * @param {Object} config - Axios configuration
   * @param {Object} context - Additional context
   * @param {any} fallbackData - Fallback data
   * @returns {Promise} Response data
   */
  async get(serviceName, url, config = {}, context = {}, fallbackData = null) {
    return externalServiceManager.executeServiceCall(
      serviceName,
      async () => {
        return TracingUtils.traceExternalAPICall(
          serviceName,
          url,
          'GET',
          async () => {
            const response = await axios.get(url, {
              timeout: config.timeout || 10000,
              ...config
            });
            return response.data;
          }
        );
      },
      {
        operationName: context.operationName || 'http_get',
        url,
        method: 'GET',
        ...context
      },
      fallbackData
    );
  }

  /**
   * Make a resilient HTTP POST request
   * @param {string} serviceName - Name of the service
   * @param {string} url - URL to request
   * @param {Object} data - Request body
   * @param {Object} config - Axios configuration
   * @param {Object} context - Additional context
   * @param {any} fallbackData - Fallback data
   * @returns {Promise} Response data
   */
  async post(serviceName, url, data = {}, config = {}, context = {}, fallbackData = null) {
    return externalServiceManager.executeServiceCall(
      serviceName,
      async () => {
        return TracingUtils.traceExternalAPICall(
          serviceName,
          url,
          'POST',
          async () => {
            const response = await axios.post(url, data, {
              timeout: config.timeout || 10000,
              ...config
            });
            return response.data;
          }
        );
      },
      {
        operationName: context.operationName || 'http_post',
        url,
        method: 'POST',
        ...context
      },
      fallbackData
    );
  }

  /**
   * Make a resilient HTTP PUT request
   * @param {string} serviceName - Name of the service
   * @param {string} url - URL to request
   * @param {Object} data - Request body
   * @param {Object} config - Axios configuration
   * @param {Object} context - Additional context
   * @param {any} fallbackData - Fallback data
   * @returns {Promise} Response data
   */
  async put(serviceName, url, data = {}, config = {}, context = {}, fallbackData = null) {
    return externalServiceManager.executeServiceCall(
      serviceName,
      async () => {
        return TracingUtils.traceExternalAPICall(
          serviceName,
          url,
          'PUT',
          async () => {
            const response = await axios.put(url, data, {
              timeout: config.timeout || 10000,
              ...config
            });
            return response.data;
          }
        );
      },
      {
        operationName: context.operationName || 'http_put',
        url,
        method: 'PUT',
        ...context
      },
      fallbackData
    );
  }

  /**
   * Make a resilient HTTP DELETE request
   * @param {string} serviceName - Name of the service
   * @param {string} url - URL to request
   * @param {Object} config - Axios configuration
   * @param {Object} context - Additional context
   * @param {any} fallbackData - Fallback data
   * @returns {Promise} Response data
   */
  async delete(serviceName, url, config = {}, context = {}, fallbackData = null) {
    return externalServiceManager.executeServiceCall(
      serviceName,
      async () => {
        return TracingUtils.traceExternalAPICall(
          serviceName,
          url,
          'DELETE',
          async () => {
            const response = await axios.delete(url, {
              timeout: config.timeout || 10000,
              ...config
            });
            return response.data;
          }
        );
      },
      {
        operationName: context.operationName || 'http_delete',
        url,
        method: 'DELETE',
        ...context
      },
      fallbackData
    );
  }

  /**
   * Execute any function with circuit breaker protection
   * @param {string} serviceName - Name of the service
   * @param {Function} operation - Operation to execute
   * @param {Object} context - Additional context
   * @param {any} fallbackData - Fallback data
   * @returns {Promise} Result of the operation
   */
  async execute(serviceName, operation, context = {}, fallbackData = null) {
    return externalServiceManager.executeServiceCall(
      serviceName,
      operation,
      {
        operationName: context.operationName || 'custom_operation',
        ...context
      },
      fallbackData
    );
  }

  /**
   * Get status of all external services
   * @returns {Object} Service status
   */
  getServiceStatus() {
    return externalServiceManager.getStatus();
  }

  /**
   * Reset a specific service circuit breaker
   * @param {string} serviceName - Name of the service
   */
  resetService(serviceName) {
    externalServiceManager.resetService(serviceName);
  }

  /**
   * Reset all service circuit breakers
   */
  resetAllServices() {
    externalServiceManager.resetAllServices();
  }

  /**
   * Force open a service circuit breaker (for maintenance)
   * @param {string} serviceName - Name of the service
   */
  forceOpenService(serviceName) {
    externalServiceManager.forceOpenService(serviceName);
  }

  /**
   * Force close a service circuit breaker (for maintenance)
   * @param {string} serviceName - Name of the service
   */
  forceCloseService(serviceName) {
    externalServiceManager.forceCloseService(serviceName);
  }
}

module.exports = new ResilientApiService();
