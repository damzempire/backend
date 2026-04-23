# Predictive Token Unlock Volume Chart Implementation

## Overview

The Predictive Token Unlock Volume Chart is a market intelligence tool that aggregates unlock schedules from all vault instances to generate daily "Projected Unlock Volume" projections. This enables project founders to anticipate sell pressure and strategically time marketing announcements, buy-back programs, and liquidity support to protect the token price and prevent community blindsiding.

## Features

### Core Capabilities
- **12-Month Projection**: Default 12-month forward-looking unlock volume forecast
- **Multi-Vault Aggregation**: Processes 1,000+ vault instances simultaneously
- **Cliff & Vesting Separation**: Distinguishes between cliff unlocks and daily vesting
- **Risk Analysis**: Identifies high-risk periods with potential sell pressure
- **Strategic Recommendations**: Actionable insights for market protection

### Analytics Features
- **Daily Granularity**: Day-by-day unlock volume projections
- **Chart Data Formatting**: Ready-to-use data for frontend visualization
- **Risk Period Detection**: Statistical analysis of unlock volume anomalies
- **Export Capabilities**: CSV and JSON export for further analysis

## Architecture

### Data Flow

```
Vaults (1,000+) → SubSchedules → Unlock Events → Daily Aggregation → Risk Analysis → Projections
```

### Service Components

#### TokenUnlockVolumeService
Main service class that handles:
- Vault data aggregation with filtering
- Daily unlock volume calculations
- Risk period identification
- Strategic recommendation generation
- Performance optimization for large datasets

#### API Endpoints
RESTful API for unlock volume data:
- `GET /api/unlock-volume/projection` - Generate 12-month projection
- `GET /api/unlock-volume/current-stats` - Current unlock statistics
- `GET /api/unlock-volume/chart-data` - Formatted chart data
- `GET /api/unlock-volume/risk-analysis` - Detailed risk assessment
- `GET /api/unlock-volume/export` - Export data (CSV/JSON)

## API Documentation

### Authentication
All endpoints require JWT authentication. Admin-level access may be required for certain filters.

### Generate 12-Month Projection

```http
GET /api/unlock-volume/projection
Authorization: Bearer <jwt_token>
Query Parameters:
  - tokenAddress: string (optional) - Filter by specific token
  - orgId: string (optional) - Filter by organization
  - vaultTags: string[] (optional) - Filter by vault tags
  - months: number (default: 12) - Projection period (1-24 months)
  - startDate: string (optional) - Start date (YYYY-MM-DD format)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projection": {
      "2024-06-01": {
        "date": "2024-06-01",
        "totalUnlockAmount": "1250.0000000",
        "cliffUnlocks": "250.0000000",
        "vestingUnlocks": "2.7397260",
        "vaultBreakdown": [
          {
            "vaultAddress": "0x1234567890abcdef",
            "vaultName": "Team Vesting",
            "vaultTag": "Team",
            "amount": "250.0000000",
            "type": "cliff",
            "beneficiaryCount": 5
          }
        ],
        "topVaults": [...],
        "cumulativeUnlocked": "1250.0000000"
      }
    },
    "insights": {
      "summary": {
        "totalProjectedUnlocks": "50000.0000000",
        "averageDailyUnlocks": "136.9863014",
        "peakUnlockDay": {
          "date": "2024-06-01",
          "amount": "1250.0000000"
        },
        "totalActiveDays": 365,
        "totalProjectionDays": 365
      },
      "topUnlockDays": [
        {
          "date": "2024-06-01",
          "amount": "1250.0000000",
          "type": "cliff_heavy"
        }
      ],
      "monthlyAggregates": [
        {
          "month": "2024-06",
          "totalUnlocks": "15000.0000000",
          "cliffUnlocks": "5000.0000000",
          "vestingUnlocks": "10000.0000000",
          "activeDays": 25,
          "peakDay": "2024-06-01",
          "peakAmount": "1250.0000000"
        }
      ],
      "riskPeriods": [
        {
          "startDate": "2024-06-01",
          "endDate": "2024-06-03",
          "peakAmount": "1250.0000000",
          "totalUnlocks": "3000.0000000",
          "days": 3,
          "averageDailyUnlocks": "1000.0000000",
          "riskLevel": "critical"
        }
      ],
      "recommendations": [
        {
          "type": "cliff_management",
          "priority": "high",
          "title": "Major Cliff Events Detected",
          "description": "3 significant cliff unlock events identified.",
          "actionItems": [
            "Schedule buy-back programs before major cliff dates",
            "Prepare community announcements in advance"
          ],
          "affectedDates": ["2024-06-01", "2024-06-15", "2024-07-01"]
        }
      ]
    },
    "metadata": {
      "totalVaults": 1250,
      "projectionPeriod": 12,
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2025-01-01T00:00:00.000Z",
      "filters": {
        "tokenAddress": null,
        "orgId": null,
        "vaultTags": null
      }
    }
  }
}
```

### Chart Data Endpoint

```http
GET /api/unlock-volume/chart-data?chartType=daily|weekly|monthly
```

**Daily Chart Response:**
```json
{
  "success": true,
  "data": {
    "chartData": {
      "labels": ["2024-06-01", "2024-06-02", ...],
      "datasets": [
        {
          "label": "Total Daily Unlocks",
          "data": [1250.0, 136.99, ...],
          "borderColor": "rgb(75, 192, 192)",
          "backgroundColor": "rgba(75, 192, 192, 0.2)"
        },
        {
          "label": "Cliff Unlocks",
          "data": [250.0, 0.0, ...],
          "borderColor": "rgb(255, 99, 132)",
          "backgroundColor": "rgba(255, 99, 132, 0.2)"
        }
      ],
      "cumulativeData": [1250.0, 1386.99, ...]
    },
    "chartType": "daily"
  }
}
```

### Risk Analysis Endpoint

```http
GET /api/unlock-volume/risk-analysis
```

**Response:**
```json
{
  "success": true,
  "data": {
    "riskAnalysis": {
      "overallRisk": "critical",
      "criticalPeriods": [
        {
          "startDate": "2024-06-01",
          "endDate": "2024-06-03",
          "riskLevel": "critical",
          "totalUnlocks": "5000.0000000"
        }
      ],
      "highRiskPeriods": [...],
      "recommendations": [...],
      "riskMetrics": {
        "totalRiskPeriods": 5,
        "averageRiskPeriodDuration": 2.8,
        "peakUnlockVolume": "1250.0000000",
        "volatilityIndex": 75.5
      }
    }
  }
}
```

## Integration Guide

### 1. Frontend Integration

#### Chart.js Integration
```javascript
// Fetch chart data
const response = await fetch('/api/unlock-volume/chart-data?chartType=daily', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { chartData } = await response.json();

// Configure Chart.js
const ctx = document.getElementById('unlockChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: chartData,
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Unlock Amount'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    }
  }
});
```

#### Risk Dashboard Integration
```javascript
// Fetch risk analysis
const riskResponse = await fetch('/api/unlock-volume/risk-analysis', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { riskAnalysis } = await riskResponse.json();

// Display risk indicators
function displayRiskLevel(riskLevel) {
  const colors = {
    low: '#28a745',
    medium: '#ffc107',
    high: '#fd7e14',
    critical: '#dc3545'
  };
  return colors[riskLevel] || '#6c757d';
}

// Update UI with risk data
document.getElementById('riskIndicator').style.backgroundColor = 
  displayRiskLevel(riskAnalysis.overallRisk);
```

### 2. Automated Monitoring

#### Daily Risk Alerts
```javascript
// Set up automated monitoring
async function checkUnlockRisks() {
  const response = await fetch('/api/unlock-volume/risk-analysis', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { riskAnalysis } = await response.json();
  
  // Send alerts for critical periods
  if (riskAnalysis.criticalPeriods.length > 0) {
    await sendAlert({
      type: 'CRITICAL_UNLOCK_RISK',
      message: `Critical unlock pressure detected: ${riskAnalysis.criticalPeriods.length} periods`,
      periods: riskAnalysis.criticalPeriods
    });
  }
}

// Run daily checks
setInterval(checkUnlockRisks, 24 * 60 * 60 * 1000);
```

#### Slack Integration
```javascript
// Send unlock summaries to Slack
async function sendDailyUnlockSummary() {
  const response = await fetch('/api/unlock-volume/current-stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { data } = await response.json();
  
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `Daily Unlock Summary:
• Total Allocated: ${data.summary.totalAllocated}
• Unlocked to Date: ${data.summary.totalUnlockedToDate}
• Recent 30-day Unlocks: ${data.summary.recentUnlocks30Days}
• Progress: ${data.summary.unlockProgressPercentage}%
      `
    })
  });
}
```

### 3. Trading Bot Integration

```python
# Python trading bot integration
import requests
import pandas as pd

def get_unlock_projection():
    response = requests.get(
        'https://api.example.com/unlock-volume/projection',
        headers={'Authorization': f'Bearer {TOKEN}'}
    )
    return response.json()

def analyze_sell_pressure():
    data = get_unlock_projection()
    projection = data['data']['projection']
    
    # Convert to DataFrame for analysis
    df = pd.DataFrame.from_dict(projection, orient='index')
    df['date'] = pd.to_datetime(df['date'])
    df['total_unlock'] = pd.to_numeric(df['totalUnlockAmount'])
    
    # Calculate moving averages
    df['7_day_ma'] = df['total_unlock'].rolling(window=7).mean()
    df['30_day_ma'] = df['total_unlock'].rolling(window=30).mean()
    
    # Identify high unlock days
    df['high_unlock'] = df['total_unlock'] > (df['30_day_ma'] * 2)
    
    return df

# Trading strategy based on unlock projections
def execute_trading_strategy():
    unlock_data = analyze_sell_pressure()
    
    for index, row in unlock_data.iterrows():
        if row['high_unlock']:
            # High unlock detected - consider market making
            place_market_maker_orders(row['date'], row['total_unlock'])
        
        if row['total_unlock'] > 1000:  # Threshold
            # Very high unlock - prepare for volatility
            increase_liquidity_provision()
```

## Usage Examples

### Basic Projection Request

```javascript
// Get standard 12-month projection
const projection = await fetch('/api/unlock-volume/projection', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get 6-month projection for specific token
const tokenProjection = await fetch('/api/unlock-volume/projection?tokenAddress=0xtoken123&months=6', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Get projection for specific organization
const orgProjection = await fetch('/api/unlock-volume/projection?orgId=org-123&vaultTags=Team,Advisors', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Risk-Based Decision Making

```javascript
// Use risk analysis for strategic decisions
async function makeStrategicDecisions() {
  const riskResponse = await fetch('/api/unlock-volume/risk-analysis', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const { riskAnalysis } = await riskResponse.json();
  
  // Implement different strategies based on risk level
  switch (riskAnalysis.overallRisk) {
    case 'critical':
      await activateEmergencyProtocols();
      await scheduleBuyBackProgram(riskAnalysis.criticalPeriods);
      await notifyCommunity('High unlock pressure expected');
      break;
      
    case 'high':
      await increaseMarketMakerSupport();
      await prepareLiquidityReserves();
      break;
      
    case 'medium':
      await monitorClosely();
      await prepareContingencyPlans();
      break;
      
    case 'low':
      await normalOperations();
      break;
  }
}
```

### Export and Analysis

```javascript
// Export data for external analysis
async function exportUnlockData() {
  const response = await fetch('/api/unlock-volume/export?format=csv&months=12', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `unlock-projection-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  
  window.URL.revokeObjectURL(url);
}

// Advanced analysis with external tools
function analyzeWithPython(data) {
  // Send data to Python analysis service
  fetch('https://analysis-service.example.com/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unlockData: data })
  });
}
```

## Performance Considerations

### Database Optimization
- **Indexed Queries**: All queries use optimized indexes on vault and schedule tables
- **Batch Processing**: Processes vaults in batches to handle 1,000+ instances
- **Caching**: Results cached for short periods to improve response times

### API Performance
- **Response Times**: Typical projection generation < 5 seconds for 1,000 vaults
- **Memory Usage**: Optimized to handle large datasets efficiently
- **Rate Limiting**: Built-in protection against excessive requests

### Scalability
- **Horizontal Scaling**: Service designed for horizontal deployment
- **Async Processing**: Non-blocking operations for better throughput
- **Resource Management**: Efficient memory and CPU utilization

## Security Considerations

### Data Access Control
- **JWT Authentication**: All endpoints require valid tokens
- **Role-Based Access**: Admin-only features for sensitive data
- **Input Validation**: Comprehensive parameter validation

### Privacy Protection
- **Vault Filtering**: Users can only access authorized vault data
- **Data Aggregation**: Sensitive individual vault data protected
- **Audit Logging**: All access logged for compliance

## Monitoring & Alerting

### Key Metrics
- **API Response Times**: Monitor projection generation performance
- **Data Accuracy**: Validate unlock calculations regularly
- **Error Rates**: Track and resolve system errors
- **Usage Patterns**: Monitor API usage patterns

### Alert Configuration
```javascript
// Configure automated alerts
const alertConfig = {
  criticalUnlockThreshold: 10000, // Alert on single-day unlocks > 10k tokens
  weeklyUnlockThreshold: 50000,  // Alert on weekly unlocks > 50k tokens
  riskScoreThreshold: 80,       // Alert on risk scores > 80%
  enableSlackAlerts: true,
  enableEmailAlerts: true,
  alertRecipients: ['team@project.com', 'trading@project.com']
};
```

## Troubleshooting

### Common Issues

**Slow Projection Generation**
- Check database indexes on vault and sub_schedule tables
- Verify server resources (CPU, memory)
- Consider reducing projection period for testing

**Incorrect Unlock Calculations**
- Verify cliff dates and vesting durations
- Check for duplicate schedule entries
- Validate timezone handling

**Missing Risk Periods**
- Ensure sufficient historical data
- Check risk threshold configuration
- Verify statistical calculations

### Debug Mode

Enable detailed logging:
```javascript
// Set debug environment variable
process.env.DEBUG = 'unlock-volume:*';

// Or enable programmatically
const service = new TokenUnlockVolumeService();
service.debugMode = true;
```

### Database Queries for Debugging

```sql
-- Check vault data integrity
SELECT 
  v.id,
  v.address,
  v.name,
  COUNT(ss.id) as schedule_count,
  SUM(ss.top_up_amount) as total_allocated,
  SUM(ss.amount_withdrawn) as total_withdrawn
FROM vaults v
LEFT JOIN sub_schedules ss ON v.id = ss.vault_id
WHERE v.is_active = true 
  AND v.is_blacklisted = false
GROUP BY v.id, v.address, v.name;

-- Check schedule data consistency
SELECT 
  ss.id,
  ss.vault_id,
  ss.cliff_date,
  ss.vesting_start_date,
  ss.vesting_duration,
  ss.top_up_amount,
  ss.amount_withdrawn,
  (ss.top_up_amount - ss.amount_withdrawn) as remaining_amount
FROM sub_schedules ss
WHERE ss.is_active = true
  AND (ss.top_up_amount - ss.amount_withdrawn) > 0;
```

## Future Enhancements

### Advanced Analytics
- **Machine Learning Predictions**: ML models for more accurate projections
- **Sentiment Analysis**: Correlate unlocks with market sentiment
- **Cross-Chain Analysis**: Multi-chain unlock aggregation
- **Real-Time Monitoring**: WebSocket-based live updates

### Enhanced Features
- **Custom Risk Models**: User-defined risk assessment models
- **Automated Trading**: Integration with trading algorithms
- **Community Tools**: Public-facing unlock calendars
- **Mobile App**: Native mobile applications

### Integration Opportunities
- **Exchange APIs**: Direct integration with major exchanges
- **DeFi Protocols**: Integration with liquidity protocols
- **Governance Systems**: DAO-based decision making
- **Insurance Products**: Unlock protection insurance

---

*This implementation provides project founders with the market intelligence needed to protect token prices and ensure community transparency around unlock events, preventing the blindsiding that often occurs with large, unannounced investor unlocks.*
