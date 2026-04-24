# Beneficiary Loyalty Badge Service Implementation

## Overview

The Beneficiary Loyalty Badge Service is a gamification system designed to improve long-term token retention by rewarding users who maintain their vested tokens without selling. The service monitors wallet balances over time and awards "Diamond Hands" badges to beneficiaries who demonstrate 100% retention for one year.

## Features

### Core Features
- **Balance Monitoring**: Continuously monitors beneficiary wallet balances on the Stellar network
- **Diamond Hands Badge**: Awards special status after 365 days of 100% token retention
- **Social Benefits**: Grants Discord roles and priority access to badge holders
- **NFT Integration**: Mints commemorative NFTs for badge recipients
- **Audit Trail**: Complete logging of all monitoring and awarding activities

### Badge Types
- **Diamond Hands**: Primary badge for 1-year 100% retention
- **Platinum Hodler**: Future extension for 2-year retention
- **Gold Holder**: Future extension for 6-month retention
- **Silver Holder**: Future extension for 3-month retention

## Architecture

### Database Schema

#### Loyalty Badges Table
```sql
CREATE TABLE loyalty_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id),
  badge_type ENUM('diamond_hands', 'platinum_hodler', 'gold_holder', 'silver_holder') NOT NULL,
  awarded_at TIMESTAMP,
  retention_period_days INTEGER NOT NULL,
  initial_vested_amount DECIMAL(36,18) NOT NULL,
  current_balance DECIMAL(36,18) NOT NULL,
  nft_metadata_uri VARCHAR,
  discord_role_granted BOOLEAN DEFAULT FALSE,
  priority_access_granted BOOLEAN DEFAULT FALSE,
  monitoring_start_date TIMESTAMP NOT NULL,
  last_balance_check TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Service Components

#### BeneficiaryLoyaltyBadgeService
Main service class that handles:
- Starting/stopping balance monitoring
- Checking wallet balances via Stellar network
- Calculating retention periods
- Awarding badges and benefits
- Generating statistics and reports

#### API Endpoints
RESTful API for managing loyalty badges:
- `POST /api/loyalty-badges/monitoring/start` - Start monitoring
- `POST /api/loyalty-badges/monitoring/check` - Run retention check
- `GET /api/loyalty-badges/beneficiary/:id` - Get beneficiary badges
- `GET /api/loyalty-badges/diamond-hands` - Get all Diamond Hands holders
- `GET /api/loyalty-badges/statistics` - Get monitoring statistics
- `POST /api/loyalty-badges/:id/award` - Manual badge award
- `GET /api/loyalty-badges/balance/:address` - Get wallet balance

## API Documentation

### Authentication
All endpoints require JWT authentication. Admin-only endpoints require elevated permissions.

### Start Monitoring
```http
POST /api/loyalty-badges/monitoring/start
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "beneficiaryId": "uuid-of-beneficiary",
  "startDate": "2024-01-01T00:00:00Z" // optional, defaults to now
}
```

**Response:**
```json
{
  "success": true,
  "message": "Started monitoring beneficiary for Diamond Hands badge",
  "monitoringRecord": {
    "id": "badge-uuid",
    "beneficiary_id": "beneficiary-uuid",
    "badge_type": "diamond_hands",
    "monitoring_start_date": "2024-01-01T00:00:00Z",
    "initial_vested_amount": "1000.0000000",
    "current_balance": "1000.0000000",
    "retention_period_days": 0,
    "is_active": true
  }
}
```

### Check Retention Periods
```http
POST /api/loyalty-badges/monitoring/check
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Monitoring check completed",
  "data": {
    "checked": 50,
    "updated": 45,
    "badgesAwarded": 3,
    "errors": []
  }
}
```

### Get Beneficiary Badges
```http
GET /api/loyalty-badges/beneficiary/{beneficiaryId}
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "badge-uuid",
      "badge_type": "diamond_hands",
      "awarded_at": "2025-01-01T00:00:00Z",
      "retention_period_days": 365,
      "nft_metadata_uri": "https://metadata.example.com/badges/diamond-hands/uuid",
      "discord_role_granted": true,
      "priority_access_granted": true
    }
  ]
}
```

### Get Monitoring Statistics
```http
GET /api/loyalty-badges/statistics
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_monitored": 150,
    "badges_awarded": 25,
    "active_monitoring": 125,
    "average_retention_days": 180.5
  }
}
```

## Integration Guide

### 1. Database Migration

Run the following SQL to create the loyalty badges table:

```sql
-- Add to your existing migration file or create a new one
CREATE TABLE loyalty_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  badge_type ENUM('diamond_hands', 'platinum_hodler', 'gold_holder', 'silver_holder') NOT NULL DEFAULT 'diamond_hands',
  awarded_at TIMESTAMP,
  retention_period_days INTEGER NOT NULL,
  initial_vested_amount DECIMAL(36,18) NOT NULL,
  current_balance DECIMAL(36,18) NOT NULL,
  nft_metadata_uri VARCHAR,
  discord_role_granted BOOLEAN DEFAULT FALSE,
  priority_access_granted BOOLEAN DEFAULT FALSE,
  monitoring_start_date TIMESTAMP NOT NULL,
  last_balance_check TIMESTAMP NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_beneficiary_badge UNIQUE (beneficiary_id, badge_type)
);

-- Indexes for performance
CREATE INDEX idx_loyalty_badges_beneficiary_id ON loyalty_badges(beneficiary_id);
CREATE INDEX idx_loyalty_badges_badge_type ON loyalty_badges(badge_type);
CREATE INDEX idx_loyalty_badges_awarded_at ON loyalty_badges(awarded_at);
```

### 2. Environment Configuration

Add these environment variables to your `.env` file:

```env
# Stellar Configuration (existing)
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Discord Integration (optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-id/your-webhook-token
DISCORD_BOT_TOKEN=your-discord-bot-token
DISCORD_DIAMOND_HANDS_ROLE_ID=123456789012345678

# NFT Configuration (optional)
NFT_MINTING_SERVICE_URL=https://nft-service.example.com
NFT_METADATA_BASE_URL=https://metadata.example.com/badges

# Monitoring Configuration
LOYALTY_BADGE_CHECK_INTERVAL_HOURS=24
DIAMOND_HANDS_THRESHOLD_DAYS=365
```

### 3. Automated Monitoring Setup

Set up a cron job to run retention checks automatically:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * curl -X POST http://localhost:4000/api/loyalty-badges/monitoring/check -H "Authorization: Bearer $ADMIN_JWT_TOKEN"
```

Or use the built-in job scheduler:

```javascript
// In your main application file
const BeneficiaryLoyaltyBadgeService = require('./services/beneficiaryLoyaltyBadgeService');

const loyaltyService = new BeneficiaryLoyaltyBadgeService();

// Run daily check
setInterval(async () => {
  try {
    await loyaltyService.checkAndUpdateRetentionPeriods();
    console.log('Loyalty badge monitoring check completed');
  } catch (error) {
    console.error('Error in loyalty badge monitoring:', error);
  }
}, 24 * 60 * 60 * 1000); // 24 hours
```

### 4. Discord Integration

To enable Discord role granting:

1. Create a Discord bot at https://discord.com/developers/applications
2. Add the bot to your server with appropriate permissions
3. Create a role for "Diamond Hands" holders
4. Configure the environment variables above
5. Implement the Discord API integration in the `grantDiscordRole` method

### 5. NFT Integration

To enable NFT badge minting:

1. Set up an NFT minting service or use existing infrastructure
2. Configure the NFT service URL in environment variables
3. Implement the NFT minting logic in the `mintBadgeNFT` method
4. Design the badge metadata schema

## Usage Examples

### Starting Monitoring for New Beneficiaries

```javascript
const BeneficiaryLoyaltyBadgeService = require('./services/beneficiaryLoyaltyBadgeService');

const loyaltyService = new BeneficiaryLoyaltyBadgeService();

// Start monitoring when a beneficiary is created or when vesting begins
async function onVestingStart(beneficiaryId) {
  try {
    const result = await loyaltyService.startMonitoring(beneficiaryId);
    console.log('Started monitoring:', result);
  } catch (error) {
    console.error('Error starting monitoring:', error);
  }
}
```

### Manual Badge Award

```javascript
// Award badge manually (admin override)
async function manualBadgeAward(badgeId) {
  try {
    const result = await loyaltyService.awardDiamondHandsBadge(badgeId);
    console.log('Badge awarded:', result);
  } catch (error) {
    console.error('Error awarding badge:', error);
  }
}
```

### Get Badge Statistics

```javascript
// Get monitoring statistics for dashboard
async function getBadgeStats() {
  try {
    const stats = await loyaltyService.getMonitoringStatistics();
    console.log('Badge statistics:', stats);
    return stats;
  } catch (error) {
    console.error('Error getting statistics:', error);
  }
}
```

## Testing

Run the test suite:

```bash
# Run all loyalty badge tests
npm test -- --testPathPattern=beneficiaryLoyaltyBadgeService

# Run with coverage
npm test -- --testPathPattern=beneficiaryLoyaltyBadgeService --coverage
```

The test suite covers:
- Starting/stopping monitoring
- Balance checking logic
- Badge awarding process
- API endpoint functionality
- Error handling scenarios

## Security Considerations

### Authentication & Authorization
- All API endpoints require valid JWT authentication
- Admin-only endpoints require elevated permissions
- Beneficiary access is restricted to their own badges

### Data Privacy
- Wallet addresses are stored in plain text (required for Stellar integration)
- Email addresses are encrypted at rest (inherited from Beneficiary model)
- Audit logging tracks all badge operations

### Rate Limiting
- API endpoints inherit existing rate limiting middleware
- Balance checking is throttled to avoid Stellar network abuse
- Monitoring checks run on scheduled intervals

## Performance Optimization

### Database Indexes
- Indexed on beneficiary_id for fast lookups
- Indexed on badge_type for filtering
- Indexed on awarded_at for chronological queries

### Caching
- Consider caching beneficiary badge status
- Cache wallet balances for short periods
- Use Redis for distributed caching if needed

### Batch Processing
- Balance checks are performed in batches
- Monitoring updates use bulk operations where possible
- Consider background job processing for large scale

## Monitoring & Alerting

### Key Metrics to Monitor
- Number of active monitoring records
- Badge award rate
- Balance check success/failure rates
- API response times

### Alerting Triggers
- High failure rate in balance checking
- Unusual drop in retention periods
- API endpoint errors
- Database connection issues

### Logging
- All badge operations are logged via auditLogger
- Balance check results are logged
- Error conditions are logged with full context

## Future Enhancements

### Additional Badge Types
- **Platinum Hodler**: 2-year retention with exclusive benefits
- **Gold Holder**: 6-month retention with premium features
- **Silver Holder**: 3-month retention with basic perks

### Advanced Features
- **Tiered Benefits**: Different benefit levels based on retention duration
- **Social Leaderboard**: Public ranking of top holders
- **Mobile App Integration**: Push notifications for milestones
- **Cross-Chain Support**: Monitor balances on multiple blockchains

### Gamification Elements
- **Achievement System**: Multiple achievement types beyond retention
- **Streak Bonuses**: Rewards for consecutive retention periods
- **Referral Rewards**: Bonus for referring new long-term holders
- **Community Challenges**: Group goals with collective rewards

## Troubleshooting

### Common Issues

**Balance Check Failures**
- Verify Stellar network connectivity
- Check rate limiting on Stellar Horizon API
- Ensure wallet addresses are valid

**Badge Not Awarded**
- Verify retention period meets threshold
- Check if monitoring is still active
- Review audit logs for errors

**Discord Role Not Granted**
- Verify Discord bot permissions
- Check webhook configuration
- Ensure role ID is correct

### Debug Mode

Enable debug logging:

```javascript
// Set environment variable
DEBUG=loyalty-badge:*

// Or enable programmatically
process.env.DEBUG = 'loyalty-badge:*';
```

### Database Queries

Useful queries for troubleshooting:

```sql
-- Check active monitoring records
SELECT * FROM loyalty_badges WHERE is_active = true;

-- Find beneficiaries close to threshold
SELECT 
  beneficiary_id,
  retention_period_days,
  monitoring_start_date,
  last_balance_check
FROM loyalty_badges 
WHERE badge_type = 'diamond_hands' 
  AND is_active = true 
  AND retention_period_days >= 360;

-- Check for failed balance checks
SELECT 
  beneficiary_id,
  last_balance_check,
  current_balance
FROM loyalty_badges 
WHERE last_balance_check < NOW() - INTERVAL '2 days';
```

## Support

For issues or questions about the Beneficiary Loyalty Badge Service:

1. Check the troubleshooting section above
2. Review the audit logs for specific error details
3. Consult the test suite for expected behavior
4. Create an issue in the project repository with detailed information

---

*This implementation transforms financial patience into social status, creating a cult-like loyalty within your community while reducing the "Instant Dumping" that often plagues new Web3 projects.*
