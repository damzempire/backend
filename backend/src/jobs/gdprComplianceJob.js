const cron = require('node-cron');
const GDPRComplianceService = require('../services/gdprComplianceService');

class GDPRComplianceJob {
  constructor() {
    this.gdprService = new GDPRComplianceService();
    this.job = null;
    this.isRunning = false;
  }

  /**
   * Start the GDPR compliance cron job (runs daily at 2 AM)
   */
  start() {
    if (this.job) {
      console.log('GDPR compliance job is already running');
      return;
    }

    // Schedule: Daily at 2:00 AM
    this.job = cron.schedule('0 2 * * *', async () => {
      if (this.isRunning) {
        console.log('GDPR compliance job is already running, skipping...');
        return;
      }

      this.isRunning = true;
      try {
        console.log('🚀 Starting scheduled GDPR compliance job...');
        const results = await this.gdprService.runGDPRComplianceCheck();
        console.log('✅ GDPR compliance job completed successfully', results);
      } catch (error) {
        console.error('❌ GDPR compliance job failed:', error);
      } finally {
        this.isRunning = false;
      }
    }, {
      scheduled: false // Don't start immediately
    });

    this.job.start();
    console.log('🔄 GDPR compliance cron job scheduled (daily at 2:00 AM)');
  }

  /**
   * Stop the GDPR compliance cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 GDPR compliance cron job stopped');
    }
  }

  /**
   * Run GDPR compliance check manually (for testing/admin purposes)
   * @returns {Promise<Object>} Results
   */
  async runManually() {
    if (this.isRunning) {
      throw new Error('GDPR compliance job is currently running');
    }

    this.isRunning = true;
    try {
      console.log('🔧 Running GDPR compliance check manually...');
      const results = await this.gdprService.runGDPRComplianceCheck();
      console.log('✅ Manual GDPR compliance check completed', results);
      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get GDPR compliance statistics
   * @returns {Promise<Object>} Statistics
   */
  async getStats() {
    return await this.gdprService.getComplianceStats();
  }
}

module.exports = GDPRComplianceJob;