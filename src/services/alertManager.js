const axios = require('axios');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const config = require('../config');

class AlertManager {
  constructor() {
    this.emailTransporter = null;
    this.initializeEmailTransporter();
  }

  initializeEmailTransporter() {
    if (config.alerting.email.smtp.host && config.alerting.email.user) {
      this.emailTransporter = nodemailer.createTransporter({
        host: config.alerting.email.smtp.host,
        port: config.alerting.email.smtp.port,
        secure: false, // true for 465, false for other ports
        auth: {
          user: config.alerting.email.user,
          pass: config.alerting.email.pass,
        },
      });
      logger.info('Email transporter initialized');
    } else {
      logger.warn('Email configuration incomplete, email alerts disabled');
    }
  }

  async sendAlert(alertData) {
    const promises = [];

    // Send webhook alert if configured
    if (config.alerting.webhookUrl) {
      promises.push(this.sendWebhookAlert(alertData));
    }

    // Send email alerts if configured
    if (this.emailTransporter && config.alerting.email.recipients.length > 0) {
      promises.push(this.sendEmailAlert(alertData));
    }

    // Execute all alert methods
    const results = await Promise.allSettled(promises);
    
    // Log results
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`Alert method ${index} failed:`, result.reason);
      }
    });

    return results;
  }

  async sendWebhookAlert(alertData) {
    try {
      const payload = {
        alert: {
          ...alertData,
          service: 'soroban-indexer-lag-alerting',
          timestamp: new Date().toISOString(),
        }
      };

      const response = await axios.post(config.alerting.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      logger.info(`Webhook alert sent successfully: ${response.status}`);
      return response;
    } catch (error) {
      logger.error('Failed to send webhook alert:', error.message);
      throw error;
    }
  }

  async sendEmailAlert(alertData) {
    try {
      const subject = `[${alertData.severity}] ${alertData.message}`;
      
      const htmlBody = this.generateEmailHtml(alertData);
      const textBody = this.generateEmailText(alertData);

      const mailOptions = {
        from: config.alerting.email.user,
        to: config.alerting.email.recipients.join(', '),
        subject,
        text: textBody,
        html: htmlBody,
      };

      const info = await this.emailTransporter.sendMail(mailOptions);
      logger.info(`Email alert sent successfully: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Failed to send email alert:', error.message);
      throw error;
    }
  }

  async sendRecoveryAlert(alertData) {
    // Modify alert data for recovery
    const recoveryAlert = {
      ...alertData,
      severity: 'INFO',
      message: `✅ ${alertData.message}`,
    };

    return this.sendAlert(recoveryAlert);
  }

  generateEmailHtml(alertData) {
    const severityColor = this.getSeverityColor(alertData.severity);
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: ${severityColor}; color: white; padding: 20px; border-radius: 5px 5px 0 0;">
            <h2 style="margin: 0;">Soroban Indexer Alert</h2>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Severity: ${alertData.severity}</p>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none;">
            <h3 style="margin-top: 0; color: #333;">${alertData.message}</h3>
            
            <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h4 style="margin-top: 0; color: #666;">Alert Details:</h4>
              <table style="width: 100%; border-collapse: collapse;">
                ${Object.entries(alertData.details).map(([key, value]) => `
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #555;">
                      ${this.formatKey(key)}
                    </td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; color: #333;">
                      ${value}
                    </td>
                  </tr>
                `).join('')}
              </table>
            </div>
            
            <div style="margin-top: 20px; padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
              <p style="margin: 0; font-size: 12px; color: #666;">
                <strong>Timestamp:</strong> ${alertData.timestamp}<br>
                <strong>Service:</strong> Soroban Indexer Lag Monitoring
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  generateEmailText(alertData) {
    return `
Soroban Indexer Alert
=====================
Severity: ${alertData.severity}
Message: ${alertData.message}

Alert Details:
${Object.entries(alertData.details).map(([key, value]) => 
  `${this.formatKey(key)}: ${value}`
).join('\n')}

Timestamp: ${alertData.timestamp}
Service: Soroban Indexer Lag Monitoring
    `;
  }

  getSeverityColor(severity) {
    const colors = {
      'HIGH': '#dc3545',
      'MEDIUM': '#ffc107',
      'LOW': '#28a745',
      'INFO': '#17a2b8',
    };
    return colors[severity] || '#6c757d';
  }

  formatKey(key) {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  }

  async testAlertConfiguration() {
    logger.info('Testing alert configuration...');
    
    const testAlert = {
      type: 'TEST_ALERT',
      severity: 'INFO',
      message: 'This is a test alert to verify configuration',
      details: {
        testTimestamp: new Date().toISOString(),
        service: 'soroban-indexer-lag-alerting',
        status: 'Configuration Test'
      }
    };

    try {
      const results = await this.sendAlert(testAlert);
      logger.info('Alert configuration test completed successfully');
      return results;
    } catch (error) {
      logger.error('Alert configuration test failed:', error);
      throw error;
    }
  }
}

module.exports = AlertManager;
