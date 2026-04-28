const { Server, Horizon } = require('@stellar/stellar-sdk');
const logger = require('../utils/logger');
const config = require('../config');
const EventEmitter = require('events');

class ShadowIndexer extends EventEmitter {
  constructor(name = 'shadow') {
    super();
    this.name = name;
    this.server = new Server(config.soroban.rpcUrl);
    this.horizon = new Horizon.Server(config.soroban.horizonUrl);
    this.lastProcessedLedger = 0;
    this.currentIndex = 0;
    this.indexingInterval = null;
    this.isIndexing = false;
    this.processedTransactions = new Map(); // Store transaction hashes for validation
    this.processedLedgers = new Map(); // Store ledger data for consistency checks
    this.stats = {
      totalLedgersProcessed: 0,
      totalTransactionsProcessed: 0,
      inconsistenciesDetected: 0,
      averageProcessingTime: 0,
      lastSyncTime: null
    };
  }

  async getCurrentLedger() {
    try {
      const latestLedger = await this.horizon.ledgers().order('desc').limit(1).call();
      return latestLedger.records[0].sequence;
    } catch (error) {
      logger.error(`[${this.name}] Error fetching current ledger:`, error);
      throw error;
    }
  }

  async getLedgerDetails(ledgerSequence) {
    try {
      const ledger = await this.horizon.ledgers().ledger(ledgerSequence).call();
      return ledger;
    } catch (error) {
      logger.error(`[${this.name}] Error fetching ledger details for ${ledgerSequence}:`, error);
      throw error;
    }
  }

  async getTransactionsForLedger(ledgerSequence) {
    try {
      const transactions = await this.horizon
        .transactions()
        .forLedger(ledgerSequence)
        .call();
      
      return transactions.records;
    } catch (error) {
      logger.error(`[${this.name}] Error fetching transactions for ledger ${ledgerSequence}:`, error);
      throw error;
    }
  }

  async processLedger(ledgerSequence) {
    const startTime = Date.now();
    
    try {
      // Get ledger details
      const ledgerDetails = await this.getLedgerDetails(ledgerSequence);
      
      // Get transactions for this ledger
      const transactions = await this.getTransactionsForLedger(ledgerSequence);
      
      // Process transactions
      const processedTxHashes = [];
      for (const tx of transactions) {
        processedTxHashes.push(tx.hash);
        this.processedTransactions.set(tx.hash, {
          ledger: ledgerSequence,
          timestamp: new Date().toISOString(),
          indexer: this.name
        });
      }

      // Store ledger data for consistency validation
      const ledgerData = {
        sequence: ledgerSequence,
        hash: ledgerDetails.hash,
        transaction_count: transactions.length,
        transaction_hashes: processedTxHashes,
        timestamp: ledgerDetails.closed_at,
        processed_at: new Date().toISOString(),
        processing_time: Date.now() - startTime,
        indexer: this.name
      };
      
      this.processedLedgers.set(ledgerSequence, ledgerData);
      
      // Update stats
      this.stats.totalLedgersProcessed++;
      this.stats.totalTransactionsProcessed += transactions.length;
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.totalLedgersProcessed - 1) + 
         ledgerData.processing_time) / this.stats.totalLedgersProcessed;
      this.stats.lastSyncTime = new Date().toISOString();

      // Emit event for real-time monitoring
      this.emit('ledgerProcessed', ledgerData);
      
      logger.debug(`[${this.name}] Processed ledger ${ledgerSequence} with ${transactions.length} transactions in ${ledgerData.processing_time}ms`);
      
      return ledgerData;
      
    } catch (error) {
      logger.error(`[${this.name}] Error processing ledger ${ledgerSequence}:`, error);
      throw error;
    }
  }

  async startIndexing(startLedger = null) {
    if (this.isIndexing) {
      logger.warn(`[${this.name}] Shadow indexer is already running`);
      return;
    }

    try {
      this.isIndexing = true;
      logger.info(`[${this.name}] Starting shadow indexer...`);

      // Get current ledger if not provided
      if (!startLedger) {
        startLedger = await this.getCurrentLedger();
      }

      this.currentIndex = startLedger;

      // Start indexing loop
      this.indexingInterval = setInterval(async () => {
        try {
          const currentLedger = await this.getCurrentLedger();
          
          // Process all ledgers from current index to current ledger
          while (this.currentIndex < currentLedger) {
            this.currentIndex++;
            await this.processLedger(this.currentIndex);
          }
          
        } catch (error) {
          logger.error(`[${this.name}] Error in indexing loop:`, error);
          this.emit('error', error);
        }
      }, config.shadowIndexing?.indexingInterval || 3000); // Default 3 seconds

      logger.info(`[${this.name}] Shadow indexer started successfully`);
      this.emit('started', { name: this.name, startLedger });
      
    } catch (error) {
      this.isIndexing = false;
      logger.error(`[${this.name}] Failed to start shadow indexer:`, error);
      throw error;
    }
  }

  stopIndexing() {
    if (!this.isIndexing) {
      logger.warn(`[${this.name}] Shadow indexer is not running`);
      return;
    }

    if (this.indexingInterval) {
      clearInterval(this.indexingInterval);
      this.indexingInterval = null;
    }
    
    this.isIndexing = false;
    logger.info(`[${this.name}] Shadow indexer stopped`);
    this.emit('stopped', { name: this.name });
  }

  async validateAgainst(mainIndexerData) {
    const inconsistencies = [];
    
    try {
      // Compare ledger data
      for (const [ledgerSeq, shadowData] of this.processedLedgers.entries()) {
        const mainData = mainIndexerData.get(ledgerSeq);
        
        if (!mainData) {
          inconsistencies.push({
            type: 'MISSING_LEDGER',
            ledger: ledgerSeq,
            shadowData,
            message: `Ledger ${ledgerSeq} exists in shadow indexer but not in main indexer`
          });
          continue;
        }

        // Validate ledger hash
        if (shadowData.hash !== mainData.hash) {
          inconsistencies.push({
            type: 'LEDGER_HASH_MISMATCH',
            ledger: ledgerSeq,
            shadowHash: shadowData.hash,
            mainHash: mainData.hash,
            message: `Ledger hash mismatch for ledger ${ledgerSeq}`
          });
        }

        // Validate transaction count
        if (shadowData.transaction_count !== mainData.transaction_count) {
          inconsistencies.push({
            type: 'TRANSACTION_COUNT_MISMATCH',
            ledger: ledgerSeq,
            shadowCount: shadowData.transaction_count,
            mainCount: mainData.transaction_count,
            message: `Transaction count mismatch for ledger ${ledgerSeq}`
          });
        }

        // Validate transaction hashes
        const shadowTxHashes = new Set(shadowData.transaction_hashes);
        const mainTxHashes = new Set(mainData.transaction_hashes);
        
        const missingInMain = [...shadowTxHashes].filter(hash => !mainTxHashes.has(hash));
        const missingInShadow = [...mainTxHashes].filter(hash => !shadowTxHashes.has(hash));
        
        if (missingInMain.length > 0) {
          inconsistencies.push({
            type: 'MISSING_TRANSACTIONS_IN_MAIN',
            ledger: ledgerSeq,
            missingTransactions: missingInMain,
            message: `${missingInMain.length} transactions missing in main indexer for ledger ${ledgerSeq}`
          });
        }
        
        if (missingInShadow.length > 0) {
          inconsistencies.push({
            type: 'MISSING_TRANSACTIONS_IN_SHADOW',
            ledger: ledgerSeq,
            missingTransactions: missingInShadow,
            message: `${missingInShadow.length} transactions missing in shadow indexer for ledger ${ledgerSeq}`
          });
        }
      }

      // Check for ledgers that exist in main but not in shadow
      for (const [ledgerSeq, mainData] of mainIndexerData.entries()) {
        if (!this.processedLedgers.has(ledgerSeq)) {
          inconsistencies.push({
            type: 'MISSING_LEDGER_IN_SHADOW',
            ledger: ledgerSeq,
            mainData,
            message: `Ledger ${ledgerSeq} exists in main indexer but not in shadow indexer`
          });
        }
      }

      if (inconsistencies.length > 0) {
        this.stats.inconsistenciesDetected += inconsistencies.length;
        logger.warn(`[${this.name}] Detected ${inconsistencies.length} inconsistencies`);
        this.emit('inconsistency', { inconsistencies, stats: this.stats });
      }

      return inconsistencies;
      
    } catch (error) {
      logger.error(`[${this.name}] Error during validation:`, error);
      throw error;
    }
  }

  getProcessedLedgers() {
    return new Map(this.processedLedgers);
  }

  getStats() {
    return {
      ...this.stats,
      name: this.name,
      isIndexing: this.isIndexing,
      currentIndex: this.currentIndex,
      processedLedgersCount: this.processedLedgers.size,
      processedTransactionsCount: this.processedTransactions.size
    };
  }

  reset() {
    this.processedLedgers.clear();
    this.processedTransactions.clear();
    this.currentIndex = 0;
    this.stats = {
      totalLedgersProcessed: 0,
      totalTransactionsProcessed: 0,
      inconsistenciesDetected: 0,
      averageProcessingTime: 0,
      lastSyncTime: null
    };
    logger.info(`[${this.name}] Shadow indexer reset completed`);
  }
}

module.exports = ShadowIndexer;
