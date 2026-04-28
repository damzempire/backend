# Push Notifications Implementation

This document describes the implementation of Firebase Cloud Messaging (FCM) push notifications for vesting cliff alerts in the Vesting Vault system.

## Overview

The system now sends native push notifications to mobile users when their vesting cliff ends, in addition to email notifications. This provides real-time alerts to users about their claimable tokens.

## Architecture

### Components

1. **Firebase Service** (`src/services/firebaseService.js`)
   - Handles Firebase Admin SDK initialization
   - Manages FCM message sending to single and multiple devices
   - Handles invalid token cleanup
   - Provides specialized cliff notification methods

2. **Device Token Model** (`src/models/deviceToken.js`)
   - Stores FCM device tokens for users
   - Tracks platform (iOS, Android, Web), app version, and usage
   - Manages token lifecycle (active/inactive status)

3. **Enhanced Notification Service** (`src/services/notificationService.js`)
   - Extended to support push notifications alongside email
   - Device token registration and management
   - Integrated with existing cliff notification cron job

4. **API Endpoints** (`src/index.js`)
   - `POST /api/notifications/register-device` - Register FCM device token
   - `DELETE /api/notifications/unregister-device` - Unregister device token
   - `GET /api/notifications/devices/:userAddress` - Get user's device tokens

### Database Schema

The `device_tokens` table includes:
- `user_address` (VARCHAR): User's wallet address
- `device_token` (TEXT): FCM device registration token
- `platform` (ENUM): Device platform (ios, android, web)
- `app_version` (VARCHAR): App version when registered
- `is_active` (BOOLEAN): Token validity status
- `last_used_at` (TIMESTAMP): Last successful notification

## Setup

### 1. Firebase Project Setup

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Cloud Messaging in the Firebase console
3. Generate a service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

### 2. Environment Configuration

Add to your `.env` file:

```env
# Firebase Configuration for Push Notifications
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
# Alternative: Use JSON string directly
# FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project",...}
```

### 3. Install Dependencies

```bash
npm install firebase-admin
```

### 4. Database Migration

Run the migration to create the device_tokens table:

```sql
-- Run: 006_create_device_tokens_table.sql
```

## Usage

### Device Registration

Mobile apps should register their FCM tokens when the user logs in:

```javascript
// Example mobile app registration
const response = await fetch('/api/notifications/register-device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAddress: '0x1234...',
    deviceToken: 'fcm-device-token-from-firebase-sdk',
    platform: 'ios', // or 'android', 'web'
    appVersion: '1.0.0'
  })
});
```

### Automatic Notifications

The system automatically sends push notifications when:
- Vault cliff dates pass
- SubSchedule cliff dates pass

Notifications are sent to all active device tokens for the vault owner.

### Manual Testing

```bash
# Run the test suite
node test-push-notifications.js
```

## API Reference

### POST /api/notifications/register-device

Register a device token for push notifications.

**Request Body:**
```json
{
  "userAddress": "0x1234567890123456789012345678901234567890",
  "deviceToken": "fcm-device-token-string",
  "platform": "ios|android|web",
  "appVersion": "1.0.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userAddress": "0x1234...",
    "platform": "ios",
    "registeredAt": "2024-01-15T10:30:00Z"
  }
}
```

### DELETE /api/notifications/unregister-device

Unregister a device token.

**Request Body:**
```json
{
  "deviceToken": "fcm-device-token-string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "unregistered": true
  }
}
```

### GET /api/notifications/devices/:userAddress

Get all active device tokens for a user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "platform": "ios",
      "appVersion": "1.0.0",
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "registeredAt": "2024-01-15T09:00:00Z"
    }
  ]
}
```

## Notification Flow

1. **Cron Job Execution**: Runs every hour to check for passed cliffs
2. **Cliff Detection**: Identifies vaults/sub-schedules with passed cliff dates
3. **Multi-Channel Notification**:
   - Email notification (if email available)
   - Push notification (if device tokens available)
4. **Token Management**: Invalid tokens are automatically marked inactive
5. **Deduplication**: Prevents duplicate notifications using the existing notification tracking

## Push Notification Payload

```json
{
  "notification": {
    "title": "🎉 Vesting Cliff Passed!",
    "body": "Your 1000 USDC are now available to claim!"
  },
  "data": {
    "type": "CLIFF_PASSED",
    "amount": "1000",
    "tokenSymbol": "USDC",
    "action": "open_app",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Error Handling

The system gracefully handles:
- Firebase initialization failures (continues without push notifications)
- Invalid or expired device tokens (marks as inactive)
- Network failures (logs errors, doesn't block email notifications)
- Missing Firebase credentials (warns and disables push notifications)

## Security Considerations

- Device tokens are stored securely in the database
- Firebase service account credentials should be kept secure
- Invalid tokens are automatically cleaned up
- Rate limiting applies to device registration endpoints

## Monitoring

The system logs:
- Firebase initialization status
- Push notification success/failure rates
- Invalid token cleanup operations
- Device registration/unregistration events

## Future Enhancements

1. **Rich Notifications**: Add images and action buttons
2. **Notification Preferences**: Allow users to customize notification types
3. **Analytics**: Track notification open rates and engagement
4. **Batch Optimization**: Optimize for high-volume notifications
5. **Multi-Language**: Support localized notification messages

## Compliance

This implementation supports:
- Real-time user engagement for time-sensitive vesting events
- Cross-platform notification delivery (iOS, Android, Web)
- Automatic token lifecycle management
- Integration with existing email notification system