const cron = require('node-cron');
const logger = require('../utils/logger');
const config = require('../config');
const AlertManager = require('./alertManager');
const EventEmitter = require('events');

class ConsistencyMonitor extends EventEmitter {
  constructor(mainIndexer, shadowIndexer) {
    super();
    this.mainIndexer = mainIndexer;
    this.shadowIndexer = shadowIndexer;
    this.alertManager = new AlertManager();
    this.isMonitoring = false;
    this.monitoringTask = null;
    this.lastValidationTime = null;
    this.consistencyHistory = [];
    this.validationStats = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      averageValidationTime: 0,
      lastValidationDuration: 0,
      criticalInconsistencies: 0,
      warningInconsistencies: 0
    };
    this.consistencyThresholds = {
      criticalInconsistencyCount: config.shadowIndexing?.criticalInconsistencyCount || 5,
      warningInconsistencyCount: config.shadowIndexing?.warningInconsistencyCount || 2,
      validationInterval: config.shadowIndexing?.validationInterval || 30,
      failoverThreshold: config.shadowIndexing?.failoverThreshold || 10
    };
  }

  async performConsistencyCheck() {
    const startTime = Date.now();
    
    try {
      logger.info('Starting consistency check between main and shadow indexers...');
      
      // Get processed ledgers from both indexers
      const mainLedgers = this.mainIndexer.getProcessedLedgers ? 
        this.mainIndexer.getProcessedLedgers() : new Map();
      const shadowLedgers = this.shadowIndexer.getProcessedLedgers();
      
      // Validate shadow indexer against main indexer
      const inconsistencies = await this.shadowIndexer.validateAgainst(mainLedgers);
      
      // Calculate consistency metrics
      const totalLedgers = Math.max(mainLedgers.size, shadowLedgers.size);
      const consistencyRate = totalLedgers > 0 ? 
        ((totalLedgers - inconsistencies.length) / totalLedgers * 100).toFixed(2) : 100;
      
      // Categorize inconsistencies
      const criticalIssues = inconsistencies.filter(inc => 
        inc.type === 'LEDGER_HASH_MISMATCH' || inc.type === 'MISSING_LEDGER'
      );
      const warningIssues = inconsistencies.filter(inc => 
        inc.type === 'TRANSACTION_COUNT_MISMATCH' || 
        inc.type === 'MISSING_TRANSACTIONS_IN_MAIN' ||
        inc.type === 'MISSING_TRANSACTIONS_IN_SHADOW'
      );
      
      // Create consistency report
      const consistencyReport = {
        timestamp: new Date().toISOString(),
        validationDuration: Date.now() - startTime,
        totalLedgers,
        consistentLedgers: totalLedgers - inconsistencies.length,
        consistencyRate: parseFloat(consistencyRate),
        totalInconsistencies: inconsistencies.length,
        criticalIssues: criticalIssues.length,
        warningIssues: warningIssues.length,
        inconsistencies: inconsistencies,
        mainIndexerStats: this.mainIndexer.getStats ? this.mainIndexer.getStats() : null,
        shadowIndexerStats: this.shadowIndexer.getStats(),
        validationPassed: inconsistencies.length <= this.consistencyThresholds.warningInconsistencyCount
      };
      
      // Update validation statistics
      this.updateValidationStats(consistencyReport);
      
      // Store in history
      this.consistencyHistory.push(consistencyReport);
      if (this.consistencyHistory.length > 100) {
        this.consistencyHistory.shift(); // Keep last 100 validations
      }
      
      // Handle consistency issues
      await this.handleConsistencyIssues(consistencyReport);
      
      // Emit event for real-time monitoring
      this.emit('consistencyCheck', consistencyReport);
      
      this.lastValidationTime = new Date();
      logger.info(`Consistency check completed in ${consistencyReport.validationDuration}ms - ` +
                  `Consistency: ${consistencyRate}%, Issues: ${inconsistencies.length}`);
      
      return consistencyReport;
      
    } catch (error) {
      logger.error('Error during consistency check:', error);
      this.emit('error', error);
      throw error;
    }
  }

  updateValidationStats(report) {
    this.validationStats.totalValidations++;
    this.validationStats.lastValidationDuration = report.validationDuration;
    this.validationStats.averageValidationTime = 
      (this.validationStats.averageValidationTime * (this.validationStats.totalValidations - 1) + 
       report.validationDuration) / this.validationStats.totalValidations;
    
    if (report.validationPassed) {
      this.validationStats.passedValidations++;
    } else {
      this.validationStats.failedValidations++;
    }
    
    this.validationStats.criticalInconsistencies += report.criticalIssues;
    this.validationStats.warningInconsistencies += report.warningIssues;
  }

  async handleConsistencyIssues(report) {
    // Check for critical issues that require immediate attention
    if (report.criticalIssues >= this.consistencyThresholds.criticalInconsistencyCount) {
      await this.sendCriticalAlert(report);
    } else if (report.totalInconsistencies >= this.consistencyThresholds.warningInconsistencyCount) {
      await this.sendWarningAlert(report);
    }
    
    // Check if failover is needed
    if (report.criticalIssues >= this.consistencyThresholds.failoverThreshold) {
      logger.warn('Critical inconsistency threshold reached, considering failover...');
      this.emit('failoverRequired', report);
      await this.sendFailoverAlert(report);
    }
    
    // Send recovery notification if consistency is restored
    if (report.validationPassed && this.validationStats.failedValidations > 0) {
      await this.sendRecoveryAlert(report);
    }
  }

  async sendCriticalAlert(report) {
    try {
      await this.alertManager.sendAlert({
        type: 'CRITICAL_CONSISTENCY_ISSUE',
        severity: 'CRITICAL',
        message: `Critical consistency issues detected between main and shadow indexers`,
        details: {
          consistencyRate: `${report.consistencyRate}%`,
          criticalIssues: report.criticalIssues,
          totalInconsistencies: report.totalInconsistencies,
          validationDuration: `${report.validationDuration}ms`,
          timestamp: report.timestamp,
          affectedLedgers: report.inconsistencies.map(inc => inc.ledger).slice(0, 10),
          recommendation: 'Immediate investigation required - potential data corruption detected'
        }
      });
    } catch (error) {
      logger.error('Failed to send critical consistency alert:', error);
    }
  }

  async sendWarningAlert(report) {
    try {
      await this.alertManager.sendAlert({
        type: 'CONSISTENCY_WARNING',
        severity: 'MEDIUM',
        message: `Consistency warnings detected between main and shadow indexers`,
        details: {
          consistencyRate: `${report.consistencyRate}%`,
          warningIssues: report.warningIssues,
          totalInconsistencies: report.totalInconsistencies,
          validationDuration: `${report.validationDuration}ms`,
          timestamp: report.timestamp,
          affectedLedgers: report.inconsistencies.map(inc => inc.ledger).slice(0, 5),
          recommendation: 'Monitor closely - investigate if issues persist'
        }
      });
    } catch (error) {
      logger.error('Failed to send warning consistency alert:', error);
    }
  }

  async sendFailoverAlert(report) {
    try {
      await this.alertManager.sendAlert({
        type: 'FAILOVER_REQUIRED',
        severity: 'CRITICAL',
        message: `Failover required - Critical consistency threshold exceeded`,
        details: {
          consistencyRate: `${report.consistencyRate}%`,
          criticalIssues: report.criticalIssues,
          failoverThreshold: this.consistencyThresholds.failoverThreshold,
          timestamp: report.timestamp,
          recommendation: 'Immediate failover to shadow indexer recommended',
          actionRequired: 'Switch to shadow indexer and investigate main indexer issues'
        }
      });
    } catch (error) {
      logger.error('Failed to send failover alert:', error);
    }
  }

  async sendRecoveryAlert(report) {
    try {
      await this.alertManager.sendRecoveryAlert({
        type: 'CONSISTENCY_RECOVERY',
        severity: 'INFO',
        message: `Consistency restored between main and shadow indexers`,
        details: {
          consistencyRate: `${report.consistencyRate}%`,
          validationPassed: report.validationPassed,
          timestamp: report.timestamp,
          previousFailedValidations: this.validationStats.failedValidations - 1
        }
      });
    } catch (error) {
      logger.error('Failed to send recovery alert:', error);
    }
  }

  startMonitoring() {
    if (this.isMonitoring) {
      logger.warn('Consistency monitoring is already running');
      return;
    }

    logger.info(`Starting consistency monitoring with ${this.consistencyThresholds.validationInterval}s interval`);
    
    // Schedule monitoring using cron
    const cronExpression = `*/${this.consistencyThresholds.validationInterval} * * * * *`;
    
    this.monitoringTask = cron.schedule(cronExpression, async () => {
      try {
        await this.performConsistencyCheck();
      } catch (error) {
        logger.error('Error in consistency monitoring cycle:', error);
      }
    }, {
      scheduled: false
    });

    this.monitoringTask.start();
    this.isMonitoring = true;
    
    logger.info('Consistency monitoring started successfully');
    this.emit('monitoringStarted');
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      logger.warn('Consistency monitoring is not running');
      return;
    }

    if (this.monitoringTask) {
      this.monitoringTask.stop();
      this.monitoringTask = null;
    }
    
    this.isMonitoring = false;
    logger.info('Consistency monitoring stopped');
    this.emit('monitoringStopped');
  }

  async triggerManualCheck() {
    logger.info('Triggering manual consistency check...');
    return await this.performConsistencyCheck();
  }

  getMonitoringStatus() {
    return {
      isMonitoring: this.isMonitoring,
      lastValidationTime: this.lastValidationTime,
      validationStats: this.validationStats,
      consistencyThresholds: this.consistencyThresholds,
      historyLength: this.consistencyHistory.length,
      recentConsistencyRate: this.consistencyHistory.length > 0 ? 
        this.consistencyHistory[this.consistencyHistory.length - 1].consistencyRate : 100
    };
  }

  getConsistencyHistory(limit = 10) {
    return this.consistencyHistory.slice(-limit);
  }

  getDetailedReport() {
    const latestReport = this.consistencyHistory.length > 0 ? 
      this.consistencyHistory[this.consistencyHistory.length - 1] : null;
    
    return {
      monitoringStatus: this.getMonitoringStatus(),
      latestReport,
      trends: {
        averageConsistencyRate: this.consistencyHistory.length > 0 ? 
          (this.consistencyHistory.reduce((sum, report) => sum + report.consistencyRate, 0) / 
           this.consistencyHistory.length).toFixed(2) : 100,
        validationFrequency: this.validationStats.totalValidations,
        failureRate: this.validationStats.totalValidations > 0 ? 
          ((this.validationStats.failedValidations / this.validationStats.totalValidations) * 100).toFixed(2) : 0
      },
      indexerComparison: {
        mainIndexerStats: this.mainIndexer.getStats ? this.mainIndexer.getStats() : null,
        shadowIndexerStats: this.shadowIndexer.getStats()
      }
    };
  }

  reset() {
    this.consistencyHistory = [];
    this.validationStats = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      averageValidationTime: 0,
      lastValidationDuration: 0,
      criticalInconsistencies: 0,
      warningInconsistencies: 0
    };
    this.lastValidationTime = null;
    logger.info('Consistency monitor reset completed');
  }
}

module.exports = ConsistencyMonitor;
