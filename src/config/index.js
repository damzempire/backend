const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const config = {
  soroban: {
    rpcUrl: process.env.SOROBAN_RPC_URL || 'https://rpc.mainnet.stellar.org',
    horizonUrl: process.env.SOROBAN_HORIZON_URL || 'https://horizon.stellar.org',
  },
  
  lagThreshold: {
    thresholdSeconds: parseInt(process.env.LAG_THRESHOLD_SECONDS) || 300, // 5 minutes default
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL_SECONDS) || 60, // 1 minute default
    alertCooldown: parseInt(process.env.ALERT_COOLDOWN_SECONDS) || 900, // 15 minutes default
  },
  
  alerting: {
    webhookUrl: process.env.WEBHOOK_URL,
    email: {
      smtp: {
        host: process.env.EMAIL_SMTP_HOST,
        port: parseInt(process.env.EMAIL_SMTP_PORT) || 587,
      },
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
      recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [],
    },
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/indexer.log',
  },
};

module.exports = config;
