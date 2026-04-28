const express = require('express');
const SorobanIndexerApp = require('../index');
const logger = require('../utils/logger');

class ApiServer {
  constructor(app, port = 3000) {
    this.app = app;
    this.server = null;
    this.port = port;
    this.setupRoutes();
  }

  setupRoutes() {
    const router = express.Router();

    // Health check endpoint
    router.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Get current status
    router.get('/status', async (req, res) => {
      try {
        const status = await this.app.getStatus();
        res.json(status);
      } catch (error) {
        logger.error('Error getting status:', error);
        res.status(500).json({ error: 'Failed to get status' });
      }
    });

    // Trigger manual consistency check
    router.post('/consistency-check', async (req, res) => {
      try {
        const result = await this.app.triggerManualConsistencyCheck();
        res.json(result);
      } catch (error) {
        logger.error('Error triggering consistency check:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Switch back to main indexer
    router.post('/switch-to-main', async (req, res) => {
      try {
        await this.app.switchToMainIndexer();
        res.json({ message: 'Switched back to main indexer successfully' });
      } catch (error) {
        logger.error('Error switching to main indexer:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Test alert configuration
    router.post('/test-alert', async (req, res) => {
      try {
        await this.app.alertManager.testAlertConfiguration();
        res.json({ message: 'Test alert sent successfully' });
      } catch (error) {
        logger.error('Error testing alert configuration:', error);
        res.status(500).json({ error: 'Failed to send test alert' });
      }
    });

    // Get consistency history
    router.get('/consistency-history', async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;
        const history = this.app.consistencyMonitor?.getConsistencyHistory(limit) || [];
        res.json({ history });
      } catch (error) {
        logger.error('Error getting consistency history:', error);
        res.status(500).json({ error: 'Failed to get consistency history' });
      }
    });

    // Get detailed consistency report
    router.get('/consistency-report', async (req, res) => {
      try {
        const report = this.app.consistencyMonitor?.getDetailedReport() || null;
        res.json({ report });
      } catch (error) {
        logger.error('Error getting consistency report:', error);
        res.status(500).json({ error: 'Failed to get consistency report' });
      }
    });

    this.router = router;
  }

  start() {
    return new Promise((resolve, reject) => {
      const app = express();
      
      // Middleware
      app.use(express.json());
      app.use(express.urlencoded({ extended: true }));
      
      // Routes
      app.use('/api', this.router);
      
      // Error handling
      app.use((err, req, res, next) => {
        logger.error('API Error:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
      
      // 404 handling
      app.use((req, res) => {
        res.status(404).json({ error: 'Endpoint not found' });
      });

      this.server = app.listen(this.port, (err) => {
        if (err) {
          reject(err);
        } else {
          logger.info(`API server started on port ${this.port}`);
          resolve();
        }
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('API server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = ApiServer;
