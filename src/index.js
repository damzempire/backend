const logger = require('./utils/logger');
const config = require('./config');
const SorobanIndexer = require('./services/sorobanIndexer');
const LagMonitor = require('./services/lagMonitor');
const AlertManager = require('./services/alertManager');

class SorobanIndexerApp {
  constructor() {
    this.indexer = new SorobanIndexer();
    this.lagMonitor = new LagMonitor();
    this.alertManager = new AlertManager();
    this.indexingInterval = null;
  }

  async start() {
    try {
      logger.info('Starting Soroban Indexer with Lag-Threshold Alerting...');
      
      // Test alert configuration first
      await this.testAlertConfiguration();
      
      // Start the indexer
      this.indexingInterval = await this.indexer.startIndexing();
      
      // Start lag monitoring
      this.lagMonitor.startMonitoring();
      
      logger.info('Soroban Indexer started successfully');
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start Soroban Indexer:', error);
      process.exit(1);
    }
  }

  async testAlertConfiguration() {
    try {
      logger.info('Testing alert configuration...');
      await this.alertManager.testAlertConfiguration();
      logger.info('Alert configuration test passed');
    } catch (error) {
      logger.warn('Alert configuration test failed:', error.message);
      logger.warn('Continuing startup, but alerts may not work properly');
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop lag monitoring
        this.lagMonitor.stopMonitoring();
        
        // Stop indexing
        if (this.indexingInterval) {
          clearInterval(this.indexingInterval);
        }
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async getStatus() {
    try {
      const lagInfo = await this.indexer.calculateLag();
      const monitoringStatus = this.lagMonitor.getMonitoringStatus();
      
      return {
        indexer: {
          currentLedger: lagInfo.currentLedger,
          indexedLedger: lagInfo.indexedLedger,
          lag: lagInfo.lag,
          isWithinThreshold: lagInfo.lag <= config.lagThreshold.thresholdSeconds
        },
        monitoring: monitoringStatus,
        config: {
          threshold: config.lagThreshold.thresholdSeconds,
          interval: config.lagThreshold.monitoringInterval,
          alertCooldown: config.lagThreshold.alertCooldown
        }
      };
    } catch (error) {
      logger.error('Error getting status:', error);
      throw error;
    }
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  const app = new SorobanIndexerApp();
  app.start().catch(error => {
    logger.error('Application startup failed:', error);
    process.exit(1);
  });
}

module.exports = SorobanIndexerApp;
