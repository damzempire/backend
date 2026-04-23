# Milestone Celebration Webhooks API

## Overview

The Milestone Celebration Webhooks API provides "Hype-as-a-Service" functionality that automatically announces major vesting milestones to community channels via Discord/Telegram bots. When a significant milestone (like a cliff ending or vesting completion) occurs, the backend triggers webhooks that broadcast celebratory messages to drive engagement and FOMO.

## Features

- **Multi-Platform Support**: Discord, Telegram, and custom webhook endpoints
- **Configurable Milestone Types**: Trigger on cliff_end, vesting_complete, or vesting_increment
- **Amount Thresholds**: Only celebrate significant milestones above configurable amounts
- **Custom Messages**: Personalized celebration templates with dynamic data
- **Security**: Optional webhook signature validation
- **Rich Embeds**: Beautiful Discord embeds with colors and structured data

## API Endpoints

### 1. Create Celebration Webhook Configuration

```http
POST /webhooks/celebration-config
```

**Request Body:**
```json
{
  "organization_id": "uuid-of-organization",
  "webhook_url": "https://discord.com/api/webhooks/your-webhook-id/token",
  "webhook_type": "discord",
  "milestone_types": ["cliff_end", "vesting_complete"],
  "min_amount_threshold": 1000,
  "custom_message_template": "🎉 **{vault_name} Milestone!** {vested_amount} tokens unlocked! 🚀",
  "secret_token": "optional-secret-for-signature-validation"
}
```

**Response:**
```json
{
  "message": "Celebration webhook created successfully",
  "webhook": {
    "id": "webhook-uuid",
    "organization_id": "org-uuid",
    "webhook_url": "https://discord.com/api/webhooks/...",
    "webhook_type": "discord",
    "is_active": true,
    "milestone_types": ["cliff_end", "vesting_complete"],
    "min_amount_threshold": "1000.000000000000000000",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Trigger Milestone Celebration

```http
POST /webhooks/milestone-celebration
```

**Request Body:**
```json
{
  "milestone_id": "uuid-of-milestone"
}
```

**Response:**
```json
{
  "message": "Milestone celebration webhooks triggered",
  "triggered": 2,
  "failed": 0,
  "total": 2,
  "milestoneData": {
    "id": "milestone-uuid",
    "type": "cliff_end",
    "vaultName": "1 Million Token Community Pool",
    "vestedAmount": 1000000,
    "cumulativeVested": 1000000,
    "priceUsd": 1.50
  }
}
```

### 3. Get Webhook Configurations

```http
GET /webhooks/celebration-config/:organizationId
```

**Response:**
```json
{
  "message": "Celebration webhooks retrieved successfully",
  "webhooks": [
    {
      "id": "webhook-uuid",
      "organization_id": "org-uuid",
      "webhook_url": "https://discord.com/api/webhooks/...",
      "webhook_type": "discord",
      "is_active": true,
      "milestone_types": ["cliff_end", "vesting_complete"],
      "min_amount_threshold": "1000.000000000000000000"
    }
  ]
}
```

### 4. Update Webhook Configuration

```http
PUT /webhooks/celebration-config/:webhookId
```

### 5. Delete Webhook Configuration

```http
DELETE /webhooks/celebration-config/:webhookId
```

## Webhook Payload Formats

### Discord Webhook Payload

```json
{
  "event": "milestone_celebration",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "content": "🎉 **Cliff Period Ended!** The 1 Million Token Community Pool cliff has ended! 1,000,000 tokens are now available for vesting. 🚀",
  "embeds": [
    {
      "title": "CLIFF END Milestone!",
      "description": "🎉 **Cliff Period Ended!** The 1 Million Token Community Pool cliff has ended! 1,000,000 tokens are now available for vesting. 🚀",
      "color": 65280,
      "fields": [
        {
          "name": "Vault",
          "value": "1 Million Token Community Pool",
          "inline": true
        },
        {
          "name": "Vested Amount",
          "value": "1,000,000 tokens",
          "inline": true
        },
        {
          name": "Total Vested",
          "value": "1,000,000 tokens",
          "inline": true
        }
      ],
      "timestamp": "2024-01-01T12:00:00.000Z"
    }
  ],
  "milestone": {
    "id": "milestone-uuid",
    "type": "cliff_end",
    "vault_name": "1 Million Token Community Pool",
    "vault_id": "vault-uuid",
    "token_address": "0x1234...",
    "vested_amount": 1000000,
    "cumulative_vested": 1000000,
    "milestone_date": "2024-01-01T12:00:00.000Z",
    "price_usd": 1.50,
    "beneficiary_wallet": "0xabcd...",
    "total_vault_amount": 5000000
  }
}
```

### Telegram Webhook Payload

```json
{
  "event": "milestone_celebration",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "text": "🎉 **Cliff Period Ended!** The 1 Million Token Community Pool cliff has ended! 1,000,000 tokens are now available for vesting. 🚀",
  "parse_mode": "Markdown",
  "milestone": { ... }
}
```

### Custom Webhook Payload

```json
{
  "event": "milestone_celebration",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "🎉 **Cliff Period Ended!** The 1 Million Token Community Pool cliff has ended! 1,000,000 tokens are now available for vesting. 🚀",
  "milestone": { ... }
}
```

## Message Templates

### Default Messages

- **Cliff End**: `🎉 **Cliff Period Ended!** The {vault_name} cliff has ended! {vested_amount} tokens are now available for vesting. 🚀`
- **Vesting Complete**: `🏆 **Vesting Complete!** The {vault_name} has fully vested! All {cumulative_vested} tokens are now unlocked! 🎊`
- **Vesting Increment**: `📈 **Vesting Milestone!** {vested_amount} tokens have vested from {vault_name}. Total vested: {cumulative_vested} tokens. ✨`

### Template Variables

- `{vault_name}`: Name of the vault
- `{vested_amount}`: Amount vested in this milestone
- `{cumulative_vested}`: Total amount vested so far
- `{milestone_type}`: Type of milestone
- `{price_usd}`: Token price in USD (if available)

## Security Features

### Webhook Signature Validation

When a `secret_token` is configured, the service includes an `X-Vesting-Signature` header:

```
X-Vesting-Signature: sha256=<hmac-signature>
```

The signature is generated using HMAC-SHA256 of the JSON payload with the secret token.

### Rate Limiting

All webhook endpoints are protected by the existing wallet-based rate limiting middleware.

## Setup Instructions

### 1. Database Migration

Run the migration to create the necessary table:

```sql
-- File: backend/migrations/014_create_milestone_celebration_webhooks_table.sql
```

### 2. Discord Bot Setup

1. Create a Discord server for your project
2. Create a Discord bot or use an existing one
3. Go to Server Settings → Integrations → Webhooks
4. Create a new webhook and copy the URL
5. Use this URL when creating the webhook configuration

### 3. Telegram Bot Setup

1. Create a Telegram bot using @BotFather
2. Add the bot to your group/channel
3. Get the webhook URL from the Telegram Bot API
4. Use this URL when creating the webhook configuration

## Usage Examples

### Example 1: Setting up Discord Notifications

```bash
curl -X POST http://localhost:4000/webhooks/celebration-config \
  -H "Content-Type: application/json" \
  -d '{
    "organization_id": "your-org-uuid",
    "webhook_url": "https://discord.com/api/webhooks/1234567890/abcdef123456",
    "webhook_type": "discord",
    "milestone_types": ["cliff_end", "vesting_complete"],
    "min_amount_threshold": 50000
  }'
```

### Example 2: Triggering a Celebration

```bash
curl -X POST http://localhost:4000/webhooks/milestone-celebration \
  -H "Content-Type: application/json" \
  -d '{
    "milestone_id": "milestone-uuid-from-database"
  }'
```

### Example 3: Custom Message Template

```json
{
  "custom_message_template": "🚀 **MAJOR ALERT!** {vault_name} just hit {milestone_type}! {vested_amount} tokens unlocked! Price: ${price_usd} USD! 💎"
}
```

## Testing

Run the test suite:

```bash
node test-milestone-celebration.js
```

This will:
- Test payload formatting for all webhook types
- Create, read, update, and delete webhook configurations
- Test the celebration trigger endpoint

## Error Handling

- **400 Bad Request**: Missing required parameters
- **404 Not Found**: Webhook or milestone not found
- **500 Internal Server Error**: Database or external service errors

All errors include detailed messages for debugging.

## Monitoring

The service logs:
- Webhook creation/update/deletion
- Successful webhook deliveries
- Failed webhook deliveries with error details
- Milestone celebration triggers

Monitor these logs to ensure your community celebrations are working properly.

## Integration with Vesting System

To automatically trigger celebrations when milestones are created, add this to your vesting service:

```javascript
const milestoneCelebrationService = require('./services/milestoneCelebrationService');

// After creating a vesting milestone
if (milestone.milestone_type === 'cliff_end' || milestone.milestone_type === 'vesting_complete') {
  try {
    await milestoneCelebrationService.triggerCelebration(milestone.id);
  } catch (error) {
    console.error('Failed to trigger celebration:', error);
  }
}
```

This ensures your community is instantly notified when major milestones are achieved!
