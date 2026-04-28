const logger = require('./utils/logger');
const config = require('./config');
const SorobanIndexer = require('./services/sorobanIndexer');
const ShadowIndexer = require('./services/shadowIndexer');
const ConsistencyMonitor = require('./services/consistencyMonitor');
const LagMonitor = require('./services/lagMonitor');
const AlertManager = require('./services/alertManager');
const ApiServer = require('./api/server');

class SorobanIndexerApp {
  constructor() {
    this.indexer = new SorobanIndexer('main');
    this.shadowIndexer = null;
    this.consistencyMonitor = null;
    this.lagMonitor = new LagMonitor();
    this.alertManager = new AlertManager();
    this.apiServer = null;
    this.isShadowModeEnabled = config.shadowIndexing.enabled;
    this.activeIndexer = this.indexer; // Will switch to shadow if needed
  }

  async start() {
    try {
      logger.info('Starting Soroban Indexer with Shadow-Indexing Mode...');
      
      // Test alert configuration first
      await this.testAlertConfiguration();
      
      // Initialize shadow indexing if enabled
      if (this.isShadowModeEnabled) {
        await this.initializeShadowIndexing();
      }
      
      // Start the main indexer
      await this.indexer.startIndexing();
      
      // Start lag monitoring
      this.lagMonitor.startMonitoring();
      
      // Start consistency monitoring if shadow mode is enabled
      if (this.consistencyMonitor) {
        this.consistencyMonitor.startMonitoring();
      }
      
      // Start API server
      this.apiServer = new ApiServer(this, process.env.API_PORT || 3000);
      await this.apiServer.start();
      
      logger.info('Soroban Indexer with Shadow-Indexing started successfully');
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      logger.error('Failed to start Soroban Indexer:', error);
      process.exit(1);
    }
  }

  async initializeShadowIndexing() {
    try {
      logger.info('Initializing shadow-indexing mode...');
      
      // Create shadow indexer
      this.shadowIndexer = new ShadowIndexer('shadow');
      
      // Create consistency monitor
      this.consistencyMonitor = new ConsistencyMonitor(this.indexer, this.shadowIndexer);
      
      // Setup event listeners for consistency monitoring
      this.setupConsistencyEventListeners();
      
      // Start shadow indexer
      await this.shadowIndexer.startIndexing();
      
      logger.info('Shadow-indexing mode initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize shadow-indexing mode:', error);
      throw error;
    }
  }

  setupConsistencyEventListeners() {
    if (!this.consistencyMonitor) return;
    
    // Handle failover requirements
    this.consistencyMonitor.on('failoverRequired', async (report) => {
      logger.warn('Failover required due to consistency issues');
      await this.handleFailover(report);
    });
    
    // Handle consistency check events
    this.consistencyMonitor.on('consistencyCheck', (report) => {
      if (!report.validationPassed) {
        logger.warn(`Consistency check failed: ${report.totalInconsistencies} issues detected`);
      }
    });
    
    // Handle shadow indexer events
    this.shadowIndexer.on('error', (error) => {
      logger.error('Shadow indexer error:', error);
    });
    
    this.shadowIndexer.on('ledgerProcessed', (ledgerData) => {
      logger.debug(`Shadow indexer processed ledger ${ledgerData.sequence}`);
    });
  }

  async handleFailover(report) {
    try {
      logger.warn('Initiating failover to shadow indexer...');
      
      // Stop main indexer
      this.indexer.stopIndexing();
      
      // Switch active indexer
      this.activeIndexer = this.shadowIndexer;
      
      // Send failover alert
      await this.alertManager.sendAlert({
        type: 'FAILOVER_COMPLETED',
        severity: 'HIGH',
        message: 'Failover to shadow indexer completed',
        details: {
          reason: 'Critical consistency issues detected',
          consistencyReport: report,
          timestamp: new Date().toISOString(),
          activeIndexer: 'shadow'
        }
      });
      
      logger.info('Failover to shadow indexer completed successfully');
      
    } catch (error) {
      logger.error('Failed to handle failover:', error);
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
        
        // Stop consistency monitoring
        if (this.consistencyMonitor) {
          this.consistencyMonitor.stopMonitoring();
        }
        
        // Stop main indexer
        this.indexer.stopIndexing();
        
        // Stop shadow indexer
        if (this.shadowIndexer) {
          this.shadowIndexer.stopIndexing();
        }
        
        // Stop API server
        if (this.apiServer) {
          await this.apiServer.stop();
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
      const lagInfo = await this.activeIndexer.calculateLag();
      const monitoringStatus = this.lagMonitor.getMonitoringStatus();
      
      const status = {
        mode: this.isShadowModeEnabled ? 'shadow-indexing' : 'standard',
        activeIndexer: this.activeIndexer.name,
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

      // Add shadow-indexing specific information
      if (this.isShadowModeEnabled && this.consistencyMonitor) {
        const consistencyStatus = this.consistencyMonitor.getMonitoringStatus();
        const detailedReport = this.consistencyMonitor.getDetailedReport();
        
        status.shadowIndexing = {
          enabled: true,
          consistency: {
            monitoring: consistencyStatus,
            recentConsistencyRate: consistencyStatus.recentConsistencyRate,
            totalValidations: consistencyStatus.validationStats.totalValidations,
            failedValidations: consistencyStatus.validationStats.failedValidations,
            lastValidationTime: consistencyStatus.lastValidationTime
          },
          indexers: {
            main: this.indexer.getStats(),
            shadow: this.shadowIndexer.getStats()
          }
        };
      }

      return status;
    } catch (error) {
      logger.error('Error getting status:', error);
      throw error;
    }
  }

  async triggerManualConsistencyCheck() {
    if (!this.consistencyMonitor) {
      throw new Error('Consistency monitoring is not available - shadow-indexing mode disabled');
    }
    
    return await this.consistencyMonitor.triggerManualCheck();
  }

  async switchToMainIndexer() {
    if (!this.isShadowModeEnabled) {
      throw new Error('Shadow-indexing mode is not enabled');
    }
    
    try {
      logger.info('Switching back to main indexer...');
      
      // Stop shadow indexer
      this.shadowIndexer.stopIndexing();
      
      // Start main indexer
      await this.indexer.startIndexing();
      
      // Switch active indexer
      this.activeIndexer = this.indexer;
      
      // Send recovery alert
      await this.alertManager.sendAlert({
        type: 'MAIN_INDEXER_RESTORED',
        severity: 'INFO',
        message: 'Switched back to main indexer',
        details: {
          timestamp: new Date().toISOString(),
          activeIndexer: 'main'
        }
      });
      
      logger.info('Successfully switched back to main indexer');
      
    } catch (error) {
      logger.error('Failed to switch back to main indexer:', error);
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
