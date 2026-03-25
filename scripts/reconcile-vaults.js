#!/usr/bin/env node

const { VaultReconciliationJob } = require('./src/jobs/vaultReconciliationJob');
require('dotenv').config();

/**
 * Manual vault reconciliation script
 * Usage: node scripts/reconcile-vaults.js [options]
 * 
 * Options:
 *   --dry-run  : Run reconciliation without triggering backfill
 *   --verbose  : Enable verbose logging
 */

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');

  console.log('=== Vault Reconciliation Script ===');
  console.log(`Mode: ${isDryRun ? 'Dry Run' : 'Live'}`);
  console.log(`Verbose: ${isVerbose ? 'Yes' : 'No'}`);
  console.log('');

  try {
    const reconciliationJob = new VaultReconciliationJob();
    
    if (isDryRun) {
      console.log('Running in dry-run mode - will not trigger backfill...');
      // Override the backfill method for dry run
      reconciliationJob.triggerBackfill = async (onChainCount, dbCount) => {
        console.log(`[DRY RUN] Would trigger backfill. On-chain: ${onChainCount}, DB: ${dbCount}`);
        await reconciliationJob.logReconciliationEvent(onChainCount, dbCount);
      };
    }

    if (isVerbose) {
      // Enable verbose logging by overriding console methods
      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(`[${new Date().toISOString()}]`, ...args);
      };
    }

    console.log('Starting vault reconciliation...');
    await reconciliationJob.runManually();
    
    console.log('');
    console.log('✅ Vault reconciliation completed successfully!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Vault reconciliation failed:');
    console.error(error.message);
    
    if (isVerbose) {
      console.error('');
      console.error('Full error details:');
      console.error(error);
    }
    
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
