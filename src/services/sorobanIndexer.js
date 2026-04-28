const { Server, Horizon } = require('@stellar/stellar-sdk');
const logger = require('../utils/logger');
const config = require('../config');

class SorobanIndexer {
  constructor() {
    this.server = new Server(config.soroban.rpcUrl);
    this.horizon = new Horizon.Server(config.soroban.horizonUrl);
    this.lastProcessedLedger = 0;
    this.currentIndex = 0;
  }

  async getCurrentLedger() {
    try {
      const latestLedger = await this.horizon.ledgers().order('desc').limit(1).call();
      return latestLedger.records[0].sequence;
    } catch (error) {
      logger.error('Error fetching current ledger:', error);
      throw error;
    }
  }

  async getIndexedLedger() {
    try {
      // This would typically come from your database
      // For now, we'll simulate it with a stored value
      return this.currentIndex;
    } catch (error) {
      logger.error('Error fetching indexed ledger:', error);
      throw error;
    }
  }

  async updateIndexedLedger(ledgerNumber) {
    try {
      this.currentIndex = ledgerNumber;
      logger.info(`Updated indexed ledger to: ${ledgerNumber}`);
      // In a real implementation, this would update your database
    } catch (error) {
      logger.error('Error updating indexed ledger:', error);
      throw error;
    }
  }

  async calculateLag() {
    try {
      const currentLedger = await this.getCurrentLedger();
      const indexedLedger = await this.getIndexedLedger();
      
      const lag = currentLedger - indexedLedger;
      logger.debug(`Current ledger: ${currentLedger}, Indexed ledger: ${indexedLedger}, Lag: ${lag}`);
      
      return {
        currentLedger,
        indexedLedger,
        lag,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating lag:', error);
      throw error;
    }
  }

  async startIndexing() {
    logger.info('Starting Soroban indexer...');
    
    // Simulate indexing process
    const indexInterval = setInterval(async () => {
      try {
        const currentLedger = await this.getCurrentLedger();
        if (currentLedger > this.currentIndex) {
          await this.updateIndexedLedger(currentLedger);
        }
      } catch (error) {
        logger.error('Error in indexing loop:', error);
      }
    }, 5000); // Index every 5 seconds

    return indexInterval;
  }
}

module.exports = SorobanIndexer;
