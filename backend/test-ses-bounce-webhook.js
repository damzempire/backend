const axios = require('axios');

// Test data for SES bounce webhook
const bounceMessage = {
  Type: 'Notification',
  MessageId: 'test-message-id',
  TopicArn: 'arn:aws:sns:us-east-1:123456789012:ses-bounces-topic',
  Subject: 'Amazon SES Message Notification',
  Message: JSON.stringify({
    notificationType: 'bounce',
    bounce: {
      bounceType: 'Permanent',
      bounceSubType: 'General',
      bouncedRecipients: [
        {
          emailAddress: 'test@example.com',
          status: '5.1.1',
          diagnosticCode: 'smtp; 550 5.1.1 User unknown'
        }
      ],
      timestamp: '2024-01-01T12:00:00.000Z',
      feedbackId: 'test-feedback-id'
    },
    mail: {
      timestamp: '2024-01-01T12:00:00.000Z',
      source: 'no-reply@vestingvault.com',
      messageId: 'test-email-id',
      destination: ['test@example.com']
    }
  }),
  Timestamp: '2024-01-01T12:00:00.000Z',
  SignatureVersion: '1',
  Signature: 'test-signature',
  SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-test.pem',
  UnsubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe'
};

// Test data for SES complaint webhook
const complaintMessage = {
  Type: 'Notification',
  MessageId: 'test-message-id',
  TopicArn: 'arn:aws:sns:us-east-1:123456789012:ses-bounces-topic',
  Subject: 'Amazon SES Message Notification',
  Message: JSON.stringify({
    notificationType: 'complaint',
    complaint: {
      complainedRecipients: [
        {
          emailAddress: 'spam@example.com'
        }
      ],
      timestamp: '2024-01-01T12:00:00.000Z',
      feedbackId: 'test-feedback-id',
      userAgent: 'Mozilla/5.0',
      complaintFeedbackType: 'abuse'
    },
    mail: {
      timestamp: '2024-01-01T12:00:00.000Z',
      source: 'no-reply@vestingvault.com',
      messageId: 'test-email-id',
      destination: ['spam@example.com']
    }
  }),
  Timestamp: '2024-01-01T12:00:00.000Z',
  SignatureVersion: '1',
  Signature: 'test-signature',
  SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-test.pem',
  UnsubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe'
};

// Test data for SNS subscription confirmation
const subscriptionConfirmation = {
  Type: 'SubscriptionConfirmation',
  MessageId: 'test-message-id',
  TopicArn: 'arn:aws:sns:us-east-1:123456789012:ses-bounces-topic',
  Token: 'test-token',
  Message: 'You have chosen to subscribe to the topic arn:aws:sns:us-east-1:123456789012:ses-bounces-topic.\n\nTo confirm the subscription, visit the SubscribeURL included in this message.',
  SubscribeURL: 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription&TopicArn=arn:aws:sns:us-east-1:123456789012:ses-bounces-topic&Token=test-token',
  Timestamp: '2024-01-01T12:00:00.000Z',
  SignatureVersion: '1',
  Signature: 'test-signature',
  SigningCertURL: 'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-test.pem'
};

async function testWebhook() {
  const baseURL = process.env.BASE_URL || 'http://localhost:4000';
  
  console.log('Testing SES bounce webhook...');
  
  try {
    // Test bounce notification
    console.log('\n1. Testing bounce notification...');
    const bounceResponse = await axios.post(`${baseURL}/webhooks/ses-bounces`, bounceMessage, {
      headers: {
        'Content-Type': 'application/json',
        'x-amz-sns-message-type': 'Notification'
      }
    });
    console.log('Bounce test response:', bounceResponse.status, bounceResponse.data);

    // Test complaint notification
    console.log('\n2. Testing complaint notification...');
    const complaintResponse = await axios.post(`${baseURL}/webhooks/ses-bounces`, complaintMessage, {
      headers: {
        'Content-Type': 'application/json',
        'x-amz-sns-message-type': 'Notification'
      }
    });
    console.log('Complaint test response:', complaintResponse.status, complaintResponse.data);

    // Test subscription confirmation (this will fail without real SNS URL, but should handle gracefully)
    console.log('\n3. Testing subscription confirmation...');
    try {
      const subscriptionResponse = await axios.post(`${baseURL}/webhooks/ses-bounces`, subscriptionConfirmation, {
        headers: {
          'Content-Type': 'application/json',
          'x-amz-sns-message-type': 'SubscriptionConfirmation'
        }
      });
      console.log('Subscription confirmation test response:', subscriptionResponse.status, subscriptionResponse.data);
    } catch (error) {
      console.log('Subscription confirmation test failed (expected):', error.message);
    }

    console.log('\n✅ All webhook tests completed!');
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Check if beneficiaries with test emails exist
async function checkBeneficiaries() {
  const { sequelize } = require('./src/database/connection');
  const Beneficiary = require('./src/models/beneficiary');
  
  try {
    await sequelize.authenticate();
    console.log('\n📊 Checking beneficiaries...');
    
    const beneficiaries = await Beneficiary.findAll({
      where: {
        email: ['test@example.com', 'spam@example.com']
      }
    });
    
    if (beneficiaries.length === 0) {
      console.log('⚠️  No test beneficiaries found. Creating test beneficiaries...');
      
      // Create test beneficiaries
      await Beneficiary.bulkCreate([
        {
          vault_id: '00000000-0000-0000-0000-000000000000',
          address: '0x0000000000000000000000000000000000000001',
          email: 'test@example.com',
          email_valid: true,
          total_allocated: '1000',
          total_withdrawn: '0'
        },
        {
          vault_id: '00000000-0000-0000-0000-000000000000',
          address: '0x0000000000000000000000000000000000000002',
          email: 'spam@example.com',
          email_valid: true,
          total_allocated: '1000',
          total_withdrawn: '0'
        }
      ]);
      
      console.log('✅ Test beneficiaries created');
    } else {
      console.log(`Found ${beneficiaries.length} test beneficiaries:`);
      beneficiaries.forEach(b => {
        console.log(`  - ${b.email}: email_valid = ${b.email_valid}`);
      });
    }
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting SES bounce webhook tests...\n');
  
  await checkBeneficiaries();
  await testWebhook();
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Check that test@example.com and spam@example.com have email_valid = false');
  console.log('2. Set up AWS SNS topic and SES configuration');
  console.log('3. Configure HTTPS endpoint in production');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testWebhook, checkBeneficiaries };
