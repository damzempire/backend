# AWS SES Email Bounce Handling Setup

This guide explains how to set up AWS SES bounce handling to protect your sender reputation by automatically marking bounced email addresses as invalid in the database.

## Overview

The system automatically:
1. Receives bounce notifications from AWS SES via SNS
2. Marks bounced email addresses as invalid in the database
3. Prevents sending emails to invalid addresses

## Prerequisites

- AWS account with SES configured
- Backend deployed and accessible via HTTPS URL
- Database migration `006_add_email_valid_to_beneficiaries.sql` applied

## Step 1: Create SNS Topic

1. Go to AWS Console → Simple Notification Service (SNS)
2. Click "Create topic"
3. Select "Standard" type
4. Enter name: `ses-bounces-topic`
5. Click "Create topic"

## Step 2: Configure SES to Send Bounce Notifications

1. Go to AWS Console → Simple Email Service (SES)
2. Click "Configuration sets" in the left menu
3. Create a new configuration set or select existing one
4. Click on your configuration set name
5. Under "VDM settings", click "Edit"
6. Enable "Bounce feedback forwarding"
7. Select your SNS topic: `ses-bounces-topic`
8. Enable "Complaint feedback forwarding"
9. Select the same SNS topic
10. Save changes

## Step 3: Create HTTPS Subscription

1. In your SNS topic `ses-bounces-topic`, click "Create subscription"
2. Protocol: HTTPS
3. Endpoint: `https://your-backend-url.com/webhooks/ses-bounces`
4. Click "Create subscription"

## Step 4: Confirm Subscription

The subscription will initially be "Pending confirmation". The webhook will automatically confirm the subscription when AWS sends the confirmation request.

## Step 5: Update Email Configuration

Update your SES configuration to use the configuration set you configured in Step 2. Update your email sending code to include the configuration set name.

## Step 6: Test the Setup

### Test Bounce Handling

1. Send an email to a known invalid address (e.g., `nonexistent@example.com`)
2. Wait for the bounce notification (usually within minutes)
3. Check the database: the `email_valid` field should be set to `false`
4. Try sending another email to the same address - it should be skipped

### Test Complaint Handling

1. Mark an email as spam in your email client
2. Wait for the complaint notification
3. Check the database: the `email_valid` field should be set to `false`

## Database Schema

The `beneficiaries` table now includes:
- `email_valid` (BOOLEAN, NOT NULL, DEFAULT true): Tracks if email is valid

## Webhook Endpoint

**URL:** `POST /webhooks/ses-bounces`

**Authentication:** None (AWS SNS validates via signature)

**Response:** 
- Success: `200 OK` with `{"message": "Webhook processed successfully"}`
- Error: `500 Internal Server Error` with error details

## Monitoring

Check your application logs for:
- `SES webhook received:` - Incoming webhook requests
- `Marking email as invalid:` - When emails are marked as invalid
- `Updated beneficiaries with email:` - Database updates

## Security Considerations

- The webhook validates SNS message signatures automatically
- Only processes messages from verified AWS SNS topics
- Logs all incoming requests for audit purposes

## Troubleshooting

### Subscription Not Confirming
- Check that your backend is accessible via HTTPS
- Verify the webhook endpoint is responding correctly
- Check application logs for any errors

### Bounces Not Being Processed
- Verify SES is configured to send bounces to the correct SNS topic
- Check that the SNS subscription is confirmed
- Review application logs for processing errors

### Emails Still Being Sent to Bounced Addresses
- Verify the database migration was applied
- Check that `email_valid` is being set to `false`
- Ensure the email service is checking the `email_valid` field
