const LagMonitor = require('../src/services/lagMonitor');
const SorobanIndexer = require('../src/services/sorobanIndexer');
const AlertManager = require('../src/services/alertManager');

// Mock dependencies
jest.mock('../src/services/sorobanIndexer');
jest.mock('../src/services/alertManager');
jest.mock('node-cron');

describe('LagMonitor', () => {
  let lagMonitor;
  let mockIndexer;
  let mockAlertManager;

  beforeEach(() => {
    mockIndexer = {
      calculateLag: jest.fn()
    };
    mockAlertManager = {
      sendAlert: jest.fn(),
      sendRecoveryAlert: jest.fn()
    };

    SorobanIndexer.mockImplementation(() => mockIndexer);
    AlertManager.mockImplementation(() => mockAlertManager);

    lagMonitor = new LagMonitor();
  });

  describe('checkLagThreshold', () => {
    it('should trigger alert when lag exceeds threshold', async () => {
      const lagInfo = {
        currentLedger: 1000,
        indexedLedger: 500,
        lag: 500,
        timestamp: new Date().toISOString()
      };

      mockIndexer.calculateLag.mockResolvedValue(lagInfo);
      mockAlertManager.sendAlert.mockResolvedValue({ success: true });

      await lagMonitor.checkLagThreshold();

      expect(mockAlertManager.sendAlert).toHaveBeenCalledWith({
        type: 'LAG_THRESHOLD_EXCEEDED',
        severity: 'HIGH',
        message: 'Soroban indexer lag threshold exceeded',
        details: expect.objectContaining({
          currentLag: 500,
          percentageBehind: '166.67%'
        })
      });
    });

    it('should not trigger alert when lag is within threshold', async () => {
      const lagInfo = {
        currentLedger: 1000,
        indexedLedger: 950,
        lag: 50,
        timestamp: new Date().toISOString()
      };

      mockIndexer.calculateLag.mockResolvedValue(lagInfo);

      await lagMonitor.checkLagThreshold();

      expect(mockAlertManager.sendAlert).not.toHaveBeenCalled();
    });

    it('should respect alert cooldown', async () => {
      const lagInfo = {
        currentLedger: 1000,
        indexedLedger: 500,
        lag: 500,
        timestamp: new Date().toISOString()
      };

      mockIndexer.calculateLag.mockResolvedValue(lagInfo);
      mockAlertManager.sendAlert.mockResolvedValue({ success: true });

      // First call should trigger alert
      await lagMonitor.checkLagThreshold();
      expect(mockAlertManager.sendAlert).toHaveBeenCalledTimes(1);

      // Second call within cooldown should not trigger alert
      await lagMonitor.checkLagThreshold();
      expect(mockAlertManager.sendAlert).toHaveBeenCalledTimes(1);
    });

    it('should send recovery alert when lag returns to normal', async () => {
      // First, trigger an alert
      const highLagInfo = {
        currentLedger: 1000,
        indexedLedger: 500,
        lag: 500,
        timestamp: new Date().toISOString()
      };

      mockIndexer.calculateLag.mockResolvedValueOnce(highLagInfo);
      mockAlertManager.sendAlert.mockResolvedValue({ success: true });

      await lagMonitor.checkLagThreshold();

      // Then, simulate recovery
      const normalLagInfo = {
        currentLedger: 1000,
        indexedLedger: 950,
        lag: 50,
        timestamp: new Date().toISOString()
      };

      mockIndexer.calculateLag.mockResolvedValueOnce(normalLagInfo);
      mockAlertManager.sendRecoveryAlert.mockResolvedValue({ success: true });

      await lagMonitor.checkLagThreshold();

      expect(mockAlertManager.sendRecoveryAlert).toHaveBeenCalledWith({
        type: 'LAG_RECOVERY',
        severity: 'INFO',
        message: 'Soroban indexer lag has recovered to acceptable levels',
        details: expect.objectContaining({
          currentLag: 50
        })
      });
    });
  });

  describe('getMonitoringStatus', () => {
    it('should return current monitoring status', () => {
      const status = lagMonitor.getMonitoringStatus();

      expect(status).toEqual({
        isMonitoring: false,
        lastAlertTime: null,
        threshold: expect.any(Number),
        interval: expect.any(Number)
      });
    });
  });
});
