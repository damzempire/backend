# Automatic KYC Status Expiration Worker Implementation

## Overview

The Automatic KYC Status Expiration Worker is a proactive compliance system that monitors KYC/AML verification expiration dates and automatically applies soft-locks to prevent project founders from sending tokens to addresses that have become "High-Risk" or unverified. This ensures ongoing due diligence requirements of international financial regulators are met.

## Features

### Core Capabilities
- **Continuous Monitoring**: Background worker checks KYC status every hour
- **Tiered Alerting**: Critical (≤3 days), High (≤7 days), Expired alerts
- **Automatic Soft-Locking**: Prevents claims from expiring/expired KYC addresses
- **Email Notifications**: Automated alerts sent to users and compliance teams
- **Risk Assessment**: Dynamic risk scoring based on KYC status and expiration proximity
- **Audit Trail**: Complete logging of all compliance actions

### Compliance Features
- **SEP-12 Integration**: Monitors Stellar SEP-12 KYC verification status
- **Multi-Provider Support**: Works with Stellar, Chainalysis, and other KYC providers
- **Regulatory Compliance**: Meets global banking standards for ongoing due diligence
- **Dashboard Integration**: Real-time status updates for admin dashboard
- **Reporting**: Comprehensive compliance and audit reporting

## Architecture

### Data Flow

```
KYC Provider APIs → KYC Status Database → Expiration Worker → Alert System → Soft Lock → Dashboard
                     ↓
               Risk Assessment → Email Service → Audit Logger → Compliance Reports
```

### System Components

#### KYCStatusExpirationWorker
Background monitoring service that:
- Checks KYC status expiration every hour
- Processes critical (≤3 days), soon (≤7 days), and expired statuses
- Applies automatic soft-locks for high-risk situations
- Sends tiered email alerts
- Generates daily compliance reports

#### KYCStatus Model
Database schema for tracking KYC compliance:
```sql
CREATE TABLE kyc_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(56) UNIQUE NOT NULL,
  sep12_customer_id VARCHAR(100),
  kyc_status ENUM('VERIFIED', 'PENDING', 'REJECTED', 'EXPIRED', 'SOFT_LOCKED') DEFAULT 'PENDING',
  kyc_level ENUM('BASIC', 'ENHANCED', 'INSTITUTIONAL') DEFAULT 'BASIC',
  verification_date TIMESTAMP,
  expiration_date TIMESTAMP,
  days_until_expiration INT GENERATED ALWAYS AS (
    CASE WHEN expiration_date IS NULL THEN NULL
    ELSE EXTRACT(DAY FROM (expiration_date - CURRENT_TIMESTAMP))
  END),
  is_expiring_soon BOOLEAN GENERATED ALWAYS AS (
    days_until_expiration BETWEEN 1 AND 7
  ),
  is_expired BOOLEAN GENERATED ALWAYS AS (
    days_until_expiration <= 0
  ),
  risk_score DECIMAL(3,2) DEFAULT 0.00,
  risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
  soft_lock_enabled BOOLEAN DEFAULT FALSE,
  soft_lock_reason TEXT,
  soft_lock_date TIMESTAMP,
  notifications_sent JSON DEFAULT '[]',
  notification_preferences JSON DEFAULT '{"email": true, "push": true, "sms": false, "in_app": true}',
  verification_provider VARCHAR(50) DEFAULT 'stellar',
  provider_reference_id VARCHAR(100),
  sep12_response_data JSON,
  compliance_notes TEXT,
  manual_review_required BOOLEAN DEFAULT FALSE,
  manual_review_date TIMESTAMP,
  reviewed_by VARCHAR(56),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### KycNotification Model
Tracks all compliance notifications:
```sql
CREATE TABLE kyc_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(56) NOT NULL,
  kyc_status_id UUID NOT NULL,
  type ENUM('kyc_critical_expiration', 'kyc_expiration_warning', 'kyc_expired', 'kyc_updated', 'kyc_soft_lock_applied', 'kyc_soft_lock_removed', 'kyc_verification_completed', 'kyc_risk_updated', 'compliance_action', 'user_engagement', 'process_improvement') DEFAULT 'kyc_updated',
  urgency ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  message TEXT NOT NULL,
  action_required BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_notification_date TIMESTAMP,
  notification_preferences JSON DEFAULT '{"email": true, "push": true, "sms": false, "in_app": true}'
);
```

## API Documentation

### Authentication
All endpoints require JWT authentication. Admin-level access required for worker management and compliance reporting.

### KYC Status Management

#### Get User KYC Status

```http
GET /api/kyc-status/user/:userAddress
Authorization: Bearer <jwt_token>
Query Parameters:
  - includeExpired: boolean (default: false) - Include expired status history
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userAddress": "GD1234567890abcdef",
    "kycStatus": {
      "id": "kyc-uuid",
      "user_address": "GD1234567890abcdef",
      "kyc_status": "VERIFIED",
      "kyc_level": "ENHANCED",
      "verification_date": "2024-01-15T00:00:00Z",
      "expiration_date": "2025-01-15T00:00:00Z",
      "days_until_expiration": 120,
      "is_expiring_soon": false,
      "is_expired": false,
      "risk_score": 0.25,
      "risk_level": "LOW",
      "soft_lock_enabled": false,
      "compliance_status": {
        "status": "VERIFIED",
        "canClaim": true,
        "urgency": "LOW",
        "message": "KYC verification is current",
        "action": "Monitor for expiration"
      }
    },
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

#### Get Expiring KYC Statuses

```http
GET /api/kyc-status/expiring
Authorization: Bearer <jwt_token>
Query Parameters:
  - days: number (default: 7) - Days threshold (1-30)
  - includeCritical: boolean (default: true) - Include only critical expirations (≤3 days)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "thresholdDays": 7,
    "expiringUsers": [
      {
        "id": "kyc-uuid",
        "user_address": "GD1234567890abcdef",
        "kyc_status": "VERIFIED",
        "expiration_date": "2024-01-10T00:00:00Z",
        "days_until_expiration": 5,
        "isCritical": false,
        "risk_level": "MEDIUM"
      }
    ],
    "summary": {
      "total": 15,
      "critical": 3,
      "soonExpiring": 12
    }
  }
}
```

#### Get Expired KYC Statuses

```http
GET /api/kyc-status/expired
Authorization: Bearer <jwt_token>
Query Parameters:
  - limit: number (default: 50) - Results per page
  - offset: number (default: 0) - Pagination offset
```

#### Get Compliance Statistics

```http
GET /api/kyc-status/statistics
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportDate": "2024-01-01T12:00:00Z",
    "totalUsers": 1000,
    "verifiedUsers": 850,
    "pendingUsers": 120,
    "expiredUsers": 15,
    "criticalExpiring": 3,
    "soonExpiring": 12,
    "softLocked": 8,
    "complianceRate": "85.00",
    "riskBreakdown": {
      "LOW": 750,
      "MEDIUM": 200,
      "HIGH": 40,
      "CRITICAL": 10
    }
  }
}
```

### Worker Management

#### Start KYC Expiration Worker

```http
POST /api/kyc-status/worker/start
Authorization: Bearer <jwt_token>
```

#### Stop KYC Expiration Worker

```http
POST /api/kyc-status/worker/stop
Authorization: Bearer <jwt_token>
```

#### Manual Expiration Check

```http
POST /api/kyc-status/worker/check
Authorization: Bearer <jwt_token>
```

#### Get Worker Status

```http
GET /api/kyc-status/worker/status
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "checkInterval": 3600000,
    "expirationThresholdDays": 7,
    "criticalThresholdDays": 3,
    "lastCheck": "2024-01-01T12:00:00Z"
  }
}
```

### Soft Lock Management

#### Apply Soft Lock

```http
POST /api/kyc-status/:kycId/soft-lock
Authorization: Bearer <jwt_token>
Body:
{
  "reason": "CRITICAL: KYC expires in 3 days or less"
}
```

#### Remove Soft Lock

```http
POST /api/kyc-status/:kycId/remove-soft-lock
Authorization: Bearer <jwt_token>
Body:
{
  "reason": "KYC status updated"
}
```

#### Update Risk Score

```http
POST /api/kyc-status/:kycId/update-risk-score
Authorization: Bearer <jwt_token>
Body:
{
  "riskScore": 0.85
}
```

### Compliance Reporting

#### Generate Compliance Report

```http
GET /api/kyc-status/compliance-report
Authorization: Bearer <jwt_token>
Query Parameters:
  - days: number (default: 30) - Report period (1-90 days)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportPeriod": 30,
    "generatedAt": "2024-01-01T12:00:00Z",
    "summary": {
      "totalUsers": 1000,
      "verifiedUsers": 850,
      "pendingUsers": 120,
      "expiredUsers": 15,
      "complianceRate": "85.00",
      "softLockedUsers": 8,
      "riskDistribution": {
        "LOW": 750,
        "MEDIUM": 200,
        "HIGH": 40,
        "CRITICAL": 10
      }
    },
    "recommendations": [
      {
        "type": "compliance_action",
        "priority": "critical",
        "title": "Expired KYC Statuses Require Attention",
        "description": "15 users have expired KYC verification. Immediate action required to restore account access and ensure compliance.",
        "actionItems": [
          "Reach out to expired users with re-verification instructions",
          "Consider temporary restrictions until re-verification is complete",
          "Review verification process for potential issues causing expirations",
          "Update risk scores for expired users to maximum"
        ]
      }
    ]
  }
}
```

## Integration Guide

### Frontend Integration

#### KYC Status Dashboard

```javascript
// Get user KYC status
async function getKycStatus(userAddress) {
  const response = await fetch(`/api/kyc-status/user/${userAddress}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const result = await response.json();
  
  if (result.success) {
    displayKycStatus(result.data);
  }
}

// Display KYC status with visual indicators
function displayKycStatus(data) {
  const status = data.kycStatus.compliance_status;
  
  const statusElement = document.getElementById('kyc-status');
  statusElement.innerHTML = `
    <div class="kyc-status ${status.urgency.toLowerCase()}">
      <div class="status-icon">
        ${getStatusIcon(status.status)}
      </div>
      <div class="status-details">
        <h3>${status.status}</h3>
        <p>${status.message}</p>
        <div class="status-actions">
          <button onclick="handleReverification()" class="${status.urgency.toLowerCase()}">
            ${status.action}
          </button>
        </div>
      </div>
    </div>
  `;
}

function getStatusIcon(status) {
  const icons = {
    'VERIFIED': '✅',
    'EXPIRING_SOON': '⚠️',
    'EXPIRED': '❌',
    'SOFT_LOCKED': '🔒'
  };
  return icons[status] || '❓';
}
```

#### Admin Compliance Dashboard

```javascript
// Get compliance statistics
async function getComplianceStats() {
  const response = await fetch('/api/kyc-status/statistics', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  
  const result = await response.json();
  
  if (result.success) {
    displayComplianceDashboard(result.data);
  }
}

// Display compliance dashboard
function displayComplianceDashboard(data) {
  const container = document.getElementById('compliance-dashboard');
  
  container.innerHTML = `
    <div class="compliance-summary">
      <h2>Compliance Overview</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Total Users</h3>
          <span class="stat-value">${data.totalUsers}</span>
        </div>
        <div class="stat-card">
          <h3>Compliance Rate</h3>
          <span class="stat-value ${data.complianceRate < 95 ? 'warning' : 'good'}">
            ${data.complianceRate}%
          </span>
        </div>
        <div class="stat-card critical">
          <h3>Critical Issues</h3>
          <span class="stat-value">${data.criticalExpiring + data.expiredUsers}</span>
        </div>
      </div>
    </div>
    
    <div class="risk-distribution">
      <h3>Risk Level Distribution</h3>
      ${Object.entries(data.riskBreakdown).map(([level, count]) => `
        <div class="risk-item ${level.toLowerCase()}">
          <span class="risk-label">${level}</span>
          <span class="risk-count">${count}</span>
        </div>
      `).join('')}
    </div>
  `;
}
```

#### Real-time Notifications

```javascript
// WebSocket for real-time KYC status updates
const ws = new WebSocket('wss://api.example.com/kyc-status/notifications');

ws.onmessage = function(event) {
  const notification = JSON.parse(event.data);
  
  switch (notification.type) {
    case 'kyc_critical_expiration':
      showCriticalAlert(notification);
      break;
    case 'kyc_expiration_warning':
      showWarningAlert(notification);
      break;
    case 'kyc_soft_lock_applied':
      showSoftLockAlert(notification);
      break;
  }
};

function showCriticalAlert(notification) {
  const alert = document.createElement('div');
  alert.className = 'alert critical';
  alert.innerHTML = `
    <h4>🚨 Critical KYC Alert</h4>
    <p>${notification.message}</p>
    <button onclick="handleImmediateAction()">Take Action</button>
  `;
  
  document.body.appendChild(alert);
  
  // Auto-remove after 30 seconds
  setTimeout(() => alert.remove(), 30000);
}
```

### Trading Bot Integration

```python
import requests
import time

class KycComplianceBot:
    def __init__(self, api_token, base_url):
        self.api_token = api_token
        self.base_url = base_url
        
    def monitor_compliance(self):
        """Monitor KYC compliance status"""
        while True:
            try:
                # Get compliance statistics
                stats = self.get_compliance_stats()
                
                if stats['criticalExpiring'] > 0:
                    self.send_critical_alert(stats)
                
                if stats['expiredUsers'] > 0:
                    self.send_expired_alert(stats)
                
                # Check if worker is running
                worker_status = self.get_worker_status()
                if not worker_status['isRunning']:
                    self.start_worker()
                
                time.sleep(3600)  # Check every hour
                
            except Exception as e:
                print(f"Error in compliance monitoring: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def get_compliance_stats(self):
        """Get current compliance statistics"""
        response = requests.get(
            f"{self.base_url}/api/kyc-status/statistics",
            headers={'Authorization': f'Bearer {self.api_token}'}
        )
        
        if response.status_code == 200:
            return response.json()['data']
        return None
    
    def send_critical_alert(self, stats):
        """Send critical compliance alert"""
        message = f"""
        🚨 CRITICAL COMPLIANCE ALERT
        
        Critical Issues: {stats['criticalExpiring']}
        Expired Users: {stats['expiredUsers']}
        Compliance Rate: {stats['complianceRate']}%
        
        Immediate action required!
        """
        
        # Send to compliance team
        self.send_email('compliance@example.com', 'Critical KYC Alert', message)
    
    def get_worker_status(self):
        """Check KYC expiration worker status"""
        response = requests.get(
            f"{self.base_url}/api/kyc-status/worker/status",
            headers={'Authorization': f'Bearer {self.api_token}'}
        )
        
        if response.status_code == 200:
            return response.json()['data']
        return None
    
    def start_worker(self):
        """Start KYC expiration worker"""
        response = requests.post(
            f"{self.base_url}/api/kyc-status/worker/start",
            headers={'Authorization': f'Bearer {self.api_token}'}
        )
        
        print(f"Worker start response: {response.status_code}")
    
    def send_email(self, to, subject, message):
        """Send email notification"""
        # Integration with email service
        print(f"Email sent to {to}: {subject}")

# Usage example
bot = KycComplianceBot('your-api-token', 'https://api.example.com')
bot.monitor_compliance()
```

## Email Templates

### Critical Expiration Alert (≤3 days)

```
Subject: 🚨 CRITICAL: KYC Status Alert - GD1234567890abcdef

CRITICAL KYC STATUS ALERT

User Address: GD1234567890abcdef
KYC Status: VERIFIED
Days Until Expiration: 2
Risk Level: MEDIUM
Risk Score: 0.45
Verification Provider: Stellar
Last Verification: 2024-01-15
Expiration Date: 2024-01-17

IMMEDIATE ACTION REQUIRED:
• User must complete re-verification immediately
• All claiming functions will be temporarily disabled
• Account may be subject to additional restrictions

Please contact support if you believe this is an error.
```

### Expiration Warning Alert (≤7 days)

```
Subject: ⚠️ KYC Status Expiration Warning - GD1234567890abcdef

KYC STATUS EXPIRATION WARNING

User Address: GD1234567890abcdef
Current KYC Status: VERIFIED
Days Until Expiration: 5
Risk Level: MEDIUM
Risk Score: 0.35
Verification Provider: Stellar
Last Verification: 2024-01-15
Expiration Date: 2024-01-20

RECOMMENDED ACTIONS:
• Complete re-verification before expiration date
• Ensure all required documentation is ready
• Contact support if you need assistance with verification process
```

### Expired KYC Alert

```
Subject: ❌ KYC Status Expired - GD1234567890abcdef

KYC STATUS EXPIRED

User Address: GD1234567890abcdef
Current KYC Status: EXPIRED
Days Expired: 3
Risk Level: HIGH
Risk Score: 0.85
Verification Provider: Stellar
Last Verification: 2024-01-15
Expiration Date: 2024-01-17

IMMEDIATE ACTION REQUIRED:
• Complete re-verification immediately to restore account access
• All claiming functions are currently disabled
• Account may be subject to temporary restrictions
• Additional verification may be required due to expired status
• Contact support immediately for assistance
```

## Performance Considerations

### Database Optimization
- **Indexed Queries**: All queries use optimized indexes on expiration dates and status
- **Batch Processing**: Processes multiple KYC records in batches for efficiency
- **Connection Pooling**: Database connection pooling for high concurrency
- **Caching**: Caches frequently accessed KYC status data

### Worker Performance
- **Efficient Scheduling**: Runs every hour with configurable intervals
- **Error Handling**: Comprehensive error handling with retry mechanisms
- **Memory Management**: Efficient memory usage for large KYC datasets
- **Monitoring**: Built-in health checks and performance metrics

### Scalability Features
- **Horizontal Scaling**: Worker designed for multi-instance deployment
- **Load Balancing**: Distributes KYC checks across multiple workers
- **Async Processing**: Non-blocking processing for better throughput
- **Resource Management**: Optimized CPU and memory utilization

## Security Considerations

### Data Privacy
- **User Isolation**: Users can only access their own KYC status
- **Admin Controls**: Admin-only access to worker management
- **Audit Logging**: Complete audit trail of all compliance actions
- **Data Encryption**: Sensitive KYC data encrypted at rest

### Compliance Security
- **Regulatory Standards**: Meets global banking compliance requirements
- **Risk Assessment**: Dynamic risk scoring based on multiple factors
- **Soft-Lock Protection**: Prevents unauthorized access from expired KYC
- **Multi-Factor**: Supports multiple verification providers for redundancy

## Monitoring & Alerting

### Key Metrics
- **Worker Uptime**: KYC expiration worker availability
- **Processing Rate**: KYC records processed per hour
- **Alert Delivery**: Email and notification delivery success rates
- **Compliance Rate**: Overall KYC compliance percentage
- **Risk Distribution**: User risk level breakdown

### Alert Configuration

```javascript
const alertConfig = {
  criticalThresholdDays: 3,    // Alert for ≤3 days
  warningThresholdDays: 7,    // Alert for ≤7 days
  emailRecipients: {
    critical: ['compliance@example.com', 'security@example.com'],
    warning: ['compliance@example.com'],
    expired: ['compliance@example.com', 'support@example.com']
  },
  enableSlackAlerts: true,
  enablePagerDuty: true,
  escalationRules: {
    critical: 'immediate',
    high: '15_minutes',
    medium: '1_hour'
  }
};
```

### Health Checks

```javascript
// Health monitoring for KYC expiration worker
async function healthCheck() {
  const response = await fetch('/api/kyc-status/worker/status', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const health = await response.json();
  
  console.log('KYC Worker Health:', {
    isRunning: health.data.isRunning,
    lastCheck: health.data.lastCheck,
    uptime: calculateUptime(health.data.lastCheck)
  });
  
  // Trigger alerts if unhealthy
  if (!health.data.isRunning) {
    triggerAlert('KYC worker is down!');
  }
}
```

## Troubleshooting

### Common Issues

**Worker Not Running**
- Check worker status via `/api/kyc-status/worker/status`
- Review application logs for startup errors
- Verify database connectivity
- Check environment variables

**Missing KYC Records**
- Verify SEP-12 API integration
- Check KYC status import processes
- Review database synchronization
- Validate user address formats

**Email Alerts Not Sending**
- Verify email service configuration
- Check SMTP settings
- Review email template formats
- Test email delivery to recipients

**Soft Lock Not Applied**
- Check KYC status update logic
- Verify risk assessment calculations
- Review soft-lock application rules
- Check database transaction logs

### Debug Mode

Enable detailed logging:
```javascript
// Set debug environment variables
process.env.DEBUG_KYC_WORKER = 'true';
process.env.DEBUG_EMAIL_SERVICE = 'true';

// Or enable programmatically
const worker = new KycStatusExpirationWorker();
worker.debugMode = true;
```

### Database Queries for Debugging

```sql
-- Check KYC expiration worker performance
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as records_processed,
  COUNT(CASE WHEN kyc_status = 'EXPIRED' THEN 1 END) as expired_found,
  COUNT(CASE WHEN soft_lock_enabled = true THEN 1 END) as soft_locks_applied
FROM kyc_statuses 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- Identify users with expiring KYC
SELECT 
  user_address,
  kyc_status,
  expiration_date,
  days_until_expiration,
  risk_level,
  soft_lock_enabled
FROM kyc_statuses 
WHERE expiration_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND is_active = true
ORDER BY expiration_date ASC;

-- Check notification delivery
SELECT 
  kn.type,
  kn.urgency,
  COUNT(*) as notification_count,
  MAX(kn.sent_at) as last_sent
FROM kyc_notifications kn
WHERE kn.sent_at >= NOW() - INTERVAL '24 hours'
GROUP BY kn.type, kn.urgency
ORDER BY kn.sent_at DESC;
```

## Future Enhancements

### Advanced Features
- **Machine Learning**: Predictive models for KYC expiration patterns
- **Multi-Chain Support**: Cross-blockchain KYC status monitoring
- **Automated Remediation**: Self-healing KYC status issues
- **Enhanced Risk Models**: More sophisticated risk assessment algorithms

### Integration Opportunities
- **Regulatory APIs**: Direct integration with financial regulator systems
- **Identity Verification**: Integration with identity verification services
- **Compliance Platforms**: API connections with compliance management platforms
- **Blockchain Analytics**: On-chain analysis of KYC compliance patterns

### Automation Improvements
- **Smart Contract Integration**: On-chain KYC status verification
- **Automated Escalation**: Intelligent escalation of compliance issues
- **Predictive Alerts**: Proactive alerts before KYC expiration
- **Self-Service Portal**: User-managed KYC re-verification

---

*This implementation ensures project founders are never at risk of sending tokens to addresses that have become "High-Risk" or unverified, fulfilling "Ongoing Due Diligence" requirements of international financial regulators through automated monitoring, alerting, and soft-lock mechanisms.*
