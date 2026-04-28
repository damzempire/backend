const AlertManager = require('../src/services/alertManager');

// Mock dependencies
jest.mock('axios');
jest.mock('nodemailer');

describe('AlertManager', () => {
  let alertManager;
  let mockAxios;
  let mockNodemailer;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    mockAxios = require('axios');
    mockNodemailer = require('nodemailer');
    
    // Mock environment variables
    process.env.WEBHOOK_URL = 'https://hooks.slack.com/test';
    process.env.EMAIL_SMTP_HOST = 'smtp.test.com';
    process.env.EMAIL_USER = 'test@test.com';
    process.env.EMAIL_PASS = 'testpass';
    process.env.ALERT_EMAIL_RECIPIENTS = 'recipient1@test.com,recipient2@test.com';
    
    alertManager = new AlertManager();
  });

  describe('sendAlert', () => {
    it('should send both webhook and email alerts when configured', async () => {
      const alertData = {
        type: 'TEST_ALERT',
        severity: 'HIGH',
        message: 'Test alert',
        details: { lag: 500 }
      };

      mockAxios.post.mockResolvedValue({ status: 200 });
      mockNodemailer.createTransporter.mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      });

      const results = await alertManager.sendAlert(alertData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        { alert: { ...alertData, service: 'soroban-indexer-lag-alerting', timestamp: expect.any(String) } },
        { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
      );

      expect(results).toHaveLength(2);
    });

    it('should handle webhook failure gracefully', async () => {
      const alertData = {
        type: 'TEST_ALERT',
        severity: 'HIGH',
        message: 'Test alert',
        details: { lag: 500 }
      };

      mockAxios.post.mockRejectedValue(new Error('Webhook failed'));
      mockNodemailer.createTransporter.mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      });

      const results = await alertManager.sendAlert(alertData);

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
    });
  });

  describe('sendRecoveryAlert', () => {
    it('should modify alert data for recovery', async () => {
      const alertData = {
        type: 'LAG_RECOVERY',
        severity: 'HIGH',
        message: 'Lag has recovered',
        details: { lag: 50 }
      };

      mockAxios.post.mockResolvedValue({ status: 200 });

      await alertManager.sendRecoveryAlert(alertData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          alert: expect.objectContaining({
            severity: 'INFO',
            message: '✅ Lag has recovered'
          })
        }),
        expect.any(Object)
      );
    });
  });

  describe('testAlertConfiguration', () => {
    it('should send test alert successfully', async () => {
      mockAxios.post.mockResolvedValue({ status: 200 });
      mockNodemailer.createTransporter.mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      });

      const results = await alertManager.testAlertConfiguration();

      expect(results).toHaveLength(2);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          alert: expect.objectContaining({
            type: 'TEST_ALERT',
            message: 'This is a test alert to verify configuration'
          })
        }),
        expect.any(Object)
      );
    });
  });
});
