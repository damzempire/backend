const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config');
const SorobanIndexer = require('./sorobanIndexer');
const AlertManager = require('./alertManager');

class LagMonitor {
  constructor() {
    this.indexer = new SorobanIndexer();
    this.alertManager = new AlertManager();
    this.lastAlertTime = null;
    this.isMonitoring = false;
  }

  async checkLagThreshold() {
    try {
      const lagInfo = await this.indexer.calculateLag();
      const { lag, currentLedger, indexedLedger } = lagInfo;
      
      logger.info(`Lag check - Current: ${currentLedger}, Indexed: ${indexedLedger}, Lag: ${lag}s`);

      // Check if lag exceeds threshold
      if (lag > config.lagThreshold.thresholdSeconds) {
        await this.handleLagThresholdExceeded(lagInfo);
      } else {
        logger.info(`Lag within acceptable threshold: ${lag}s`);
        // Optionally send recovery notification if we were previously in alert state
        await this.handleLagRecovery(lagInfo);
      }

      return lagInfo;
    } catch (error) {
      logger.error('Error checking lag threshold:', error);
      throw error;
    }
  }

  async handleLagThresholdExceeded(lagInfo) {
    const now = new Date();
    const cooldownExpired = !this.lastAlertTime || 
      (now - this.lastAlertTime) > (config.lagThreshold.alertCooldown * 1000);

    if (cooldownExpired) {
      logger.warn(`Lag threshold exceeded! Lag: ${lagInfo.lag}s, Threshold: ${config.lagThreshold.thresholdSeconds}s`);
      
      try {
        await this.alertManager.sendAlert({
          type: 'LAG_THRESHOLD_EXCEEDED',
          severity: 'HIGH',
          message: `Soroban indexer lag threshold exceeded`,
          details: {
            currentLag: lagInfo.lag,
            threshold: config.lagThreshold.thresholdSeconds,
            currentLedger: lagInfo.currentLedger,
            indexedLedger: lagInfo.indexedLedger,
            timestamp: lagInfo.timestamp,
            percentageBehind: ((lagInfo.lag / config.lagThreshold.thresholdSeconds) * 100).toFixed(2) + '%'
          }
        });

        this.lastAlertTime = now;
        logger.info('Alert sent successfully');
      } catch (error) {
        logger.error('Failed to send alert:', error);
      }
    } else {
      logger.debug('Alert cooldown active, skipping notification');
    }
  }

  async handleLagRecovery(lagInfo) {
    // Check if we were previously in alert state and have recovered
    if (this.lastAlertTime && lagInfo.lag <= config.lagThreshold.thresholdSeconds) {
      try {
        await this.alertManager.sendRecoveryAlert({
          type: 'LAG_RECOVERY',
          severity: 'INFO',
          message: `Soroban indexer lag has recovered to acceptable levels`,
          details: {
            currentLag: lagInfo.lag,
            threshold: config.lagThreshold.thresholdSeconds,
            currentLedger: lagInfo.currentLedger,
            indexedLedger: lagInfo.indexedLedger,
            timestamp: lagInfo.timestamp
          }
        });

        this.lastAlertTime = null; // Reset alert state
        logger.info('Recovery alert sent successfully');
      } catch (error) {
        logger.error('Failed to send recovery alert:', error);
      }
    }
  }

  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Lag monitoring is already running');
      return;
    }

    logger.info(`Starting lag monitoring with ${config.lagThreshold.monitoringInterval}s interval`);
    
    // Schedule monitoring using cron
    const cronExpression = `*/${config.lagThreshold.monitoringInterval} * * * * *`;
    
    this.monitoringTask = cron.schedule(cronExpression, async () => {
      try {
        await this.checkLagThreshold();
      } catch (error) {
        logger.error('Error in lag monitoring cycle:', error);
      }
    }, {
      scheduled: false
    });

    this.monitoringTask.start();
    this.isMonitoring = true;
    
    logger.info('Lag monitoring started successfully');
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      logger.warn('Lag monitoring is not running');
      return;
    }

    if (this.monitoringTask) {
      this.monitoringTask.stop();
      this.monitoringTask = null;
    }
    
    this.isMonitoring = false;
    logger.info('Lag monitoring stopped');
  }

  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastAlertTime: this.lastAlertTime,
      threshold: config.lagThreshold.thresholdSeconds,
      interval: config.lagThreshold.monitoringInterval
    };
  }
}

module.exports = LagMonitor;
