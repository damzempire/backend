const cron = require('node-cron');
const vaultRegistryService = require('../services/vaultRegistryService');
const Sentry = require('@sentry/node');

class VaultRegistryIndexingJob {
  constructor() {
    this.isRunning = false;
    this.jobName = 'vault-registry-indexing';
  }

  /**
   * Start the vault registry indexing job
   * Runs every 2 minutes to check for new vault deployments
   */
  start() {
    console.log('Starting Vault Registry Indexing Job...');
    
    // Schedule to run every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      if (this.isRunning) {
        console.log('Vault registry indexing job already running, skipping...');
        return;
      }

      await this.execute();
    });

    // Also run once on startup
    setTimeout(() => this.execute(), 5000);
  }

  /**
   * Execute the vault registry indexing
   */
  async execute() {
    if (this.isRunning) {
      console.log('Vault registry indexing already in progress');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`[${new Date().toISOString()}] Starting vault registry indexing...`);
      
      const result = await vaultRegistryService.monitorForNewVaults();
      
      const duration = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] Vault registry indexing completed in ${duration}ms`);
      console.log(`Processed ${result.processed} ledgers, found ${result.newVaults.length} new vaults`);

      // Log details about new vaults found
      if (result.newVaults.length > 0) {
        console.log('New vaults discovered:');
        result.newVaults.forEach(vault => {
          console.log(`  - ${vault.contract_id} (${vault.project_name}) by ${vault.creator_address}`);
        });
      }

      // Send metrics to monitoring system if available
      this.sendMetrics(result, duration);

    } catch (error) {
      console.error('Error in vault registry indexing job:', error);
      Sentry.captureException(error, {
        tags: { 
          job: this.jobName,
          operation: 'indexing'
        },
        extra: {
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Send metrics to monitoring system
   */
  sendMetrics(result, duration) {
    try {
      // This could integrate with your monitoring system
      // For now, we'll just log the metrics
      const metrics = {
        job_name: this.jobName,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        ledgers_processed: result.processed,
        new_vaults_found: result.newVaults.length,
        success: true
      };

      console.log('Vault Registry Indexing Metrics:', JSON.stringify(metrics, null, 2));

      // You could send this to:
      // - Prometheus
      // - CloudWatch
      // - DataDog
      // - Your custom metrics system
      
    } catch (error) {
      console.error('Error sending metrics:', error);
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      name: this.jobName,
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      uptime: this.startTime ? Date.now() - this.startTime : 0
    };
  }

  /**
   * Stop the job
   */
  stop() {
    console.log('Stopping Vault Registry Indexing Job...');
    // Note: cron jobs don't have a built-in stop method in node-cron
    // In a production environment, you might want to use a more sophisticated job scheduler
  }

  /**
   * Manually trigger the indexing process
   */
  async trigger() {
    console.log('Manually triggering vault registry indexing...');
    await this.execute();
  }
}

// Create and export singleton instance
const vaultRegistryIndexingJob = new VaultRegistryIndexingJob();

module.exports = vaultRegistryIndexingJob;
