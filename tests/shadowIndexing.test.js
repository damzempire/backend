const SorobanIndexer = require('../src/services/sorobanIndexer');
const ShadowIndexer = require('../src/services/shadowIndexer');
const ConsistencyMonitor = require('../src/services/consistencyMonitor');
const config = require('../src/config');

describe('Shadow-Indexing Mode Tests', () => {
  let mainIndexer, shadowIndexer, consistencyMonitor;

  beforeEach(() => {
    // Mock config for testing
    config.shadowIndexing.enabled = true;
    config.shadowIndexing.validationInterval = 5;
    config.shadowIndexing.criticalInconsistencyCount = 3;
    config.shadowIndexing.warningInconsistencyCount = 1;
    
    mainIndexer = new SorobanIndexer('main');
    shadowIndexer = new ShadowIndexer('shadow');
    consistencyMonitor = new ConsistencyMonitor(mainIndexer, shadowIndexer);
  });

  describe('ShadowIndexer', () => {
    test('should initialize with correct name', () => {
      expect(shadowIndexer.name).toBe('shadow');
    });

    test('should track processed ledgers', () => {
      const mockLedgerData = {
        sequence: 12345,
        hash: 'test-hash',
        transaction_count: 5,
        transaction_hashes: ['tx1', 'tx2', 'tx3', 'tx4', 'tx5'],
        timestamp: '2023-01-01T00:00:00Z',
        processed_at: new Date().toISOString(),
        processing_time: 100,
        indexer: 'shadow'
      };

      shadowIndexer.processedLedgers.set(12345, mockLedgerData);
      
      expect(shadowIndexer.getProcessedLedgers().get(12345)).toEqual(mockLedgerData);
    });

    test('should calculate stats correctly', () => {
      shadowIndexer.stats.totalLedgersProcessed = 10;
      shadowIndexer.stats.totalTransactionsProcessed = 50;
      shadowIndexer.currentIndex = 12345;
      
      const stats = shadowIndexer.getStats();
      
      expect(stats.totalLedgersProcessed).toBe(10);
      expect(stats.totalTransactionsProcessed).toBe(50);
      expect(stats.currentIndex).toBe(12345);
      expect(stats.name).toBe('shadow');
    });
  });

  describe('ConsistencyMonitor', () => {
    test('should initialize with correct thresholds', () => {
      expect(consistencyMonitor.consistencyThresholds.criticalInconsistencyCount).toBe(3);
      expect(consistencyMonitor.consistencyThresholds.warningInconsistencyCount).toBe(1);
    });

    test('should update validation stats correctly', () => {
      const mockReport = {
        validationPassed: true,
        validationDuration: 150,
        criticalIssues: 0,
        warningIssues: 1,
        totalInconsistencies: 1
      };

      consistencyMonitor.updateValidationStats(mockReport);
      
      const stats = consistencyMonitor.validationStats;
      expect(stats.totalValidations).toBe(1);
      expect(stats.passedValidations).toBe(1);
      expect(stats.failedValidations).toBe(0);
      expect(stats.averageValidationTime).toBe(150);
    });

    test('should categorize inconsistencies correctly', () => {
      const inconsistencies = [
        { type: 'LEDGER_HASH_MISMATCH' },
        { type: 'TRANSACTION_COUNT_MISMATCH' },
        { type: 'MISSING_LEDGER' }
      ];

      const criticalIssues = inconsistencies.filter(inc => 
        inc.type === 'LEDGER_HASH_MISMATCH' || inc.type === 'MISSING_LEDGER'
      );
      
      expect(criticalIssues.length).toBe(2);
    });
  });

  describe('Integration Tests', () => {
    test('should handle shadow indexing workflow', async () => {
      // Mock ledger processing
      const mockLedgerData = {
        sequence: 12345,
        hash: 'test-hash',
        transaction_count: 3,
        transaction_hashes: ['tx1', 'tx2', 'tx3'],
        timestamp: '2023-01-01T00:00:00Z',
        processed_at: new Date().toISOString(),
        processing_time: 100,
        indexer: 'main'
      };

      // Add to main indexer
      mainIndexer.processedLedgers.set(12345, mockLedgerData);
      
      // Add same data to shadow indexer
      const shadowLedgerData = { ...mockLedgerData, indexer: 'shadow' };
      shadowIndexer.processedLedgers.set(12345, shadowLedgerData);

      // Validate consistency
      const inconsistencies = await shadowIndexer.validateAgainst(mainIndexer.processedLedgers);
      
      expect(inconsistencies.length).toBe(0);
    });

    test('should detect ledger hash mismatches', async () => {
      const mainLedgerData = {
        sequence: 12345,
        hash: 'main-hash',
        transaction_count: 3,
        transaction_hashes: ['tx1', 'tx2', 'tx3'],
        timestamp: '2023-01-01T00:00:00Z',
        processed_at: new Date().toISOString(),
        processing_time: 100,
        indexer: 'main'
      };

      const shadowLedgerData = {
        sequence: 12345,
        hash: 'shadow-hash', // Different hash
        transaction_count: 3,
        transaction_hashes: ['tx1', 'tx2', 'tx3'],
        timestamp: '2023-01-01T00:00:00Z',
        processed_at: new Date().toISOString(),
        processing_time: 100,
        indexer: 'shadow'
      };

      mainIndexer.processedLedgers.set(12345, mainLedgerData);
      shadowIndexer.processedLedgers.set(12345, shadowLedgerData);

      const inconsistencies = await shadowIndexer.validateAgainst(mainIndexer.processedLedgers);
      
      expect(inconsistencies.length).toBe(1);
      expect(inconsistencies[0].type).toBe('LEDGER_HASH_MISMATCH');
    });
  });
});
