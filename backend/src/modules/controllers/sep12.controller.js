const SEP12Service = require('../services/sep12.service');

class SEP12Controller {
  constructor(dbManager) {
    this.sep12Service = new SEP12Service(dbManager);
  }

  async getCustomer(req, res) {
    try {
      const { account, memo, memo_type, type } = req.query;
      const result = await this.sep12Service.getCustomerStatus(account, memo, memo_type, type);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get customer status',
        message: error.message
      });
    }
  }

  async updateCustomer(req, res) {
    try {
      const customerData = req.body;
      const result = await this.sep12Service.updateCustomer(customerData);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to update customer',
        message: error.message
      });
    }
  }

  registerRoutes(app) {
    app.get('/kyc/customer', this.getCustomer.bind(this));
    app.put('/kyc/customer', this.updateCustomer.bind(this));
    
    app.get('/kyc/health', (req, res) => {
      res.json({
        status: 'healthy',
        module: 'SEP-12 KYC',
        timestamp: new Date().toISOString()
      });
    });
  }
}

module.exports = SEP12Controller;
