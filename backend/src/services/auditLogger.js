const fs = require('fs');
const path = require('path');

class AuditLogger {
  constructor() {
    this.logFilePath = path.join(__dirname, '../../logs/audit.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  logAction(adminAddress, action, targetVault) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${adminAddress}] [${action}] [${targetVault}]\n`;
    
    try {
      fs.appendFileSync(this.logFilePath, logEntry);
      console.log(`Audit log: ${logEntry.trim()}`);
    } catch (error) {
      console.error('Failed to write to audit log:', error);
    }
  }

  getLogEntries() {
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return [];
      }
      
      const logContent = fs.readFileSync(this.logFilePath, 'utf8');
      return logContent
        .split('\n')
        .filter(line => line.trim() !== '')
        .reverse(); // Most recent first
    } catch (error) {
      console.error('Failed to read audit log:', error);
      return [];
    }
  }
}

module.exports = new AuditLogger();
