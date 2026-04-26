const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * KycNotification - Model for tracking KYC compliance notifications
 * 
 * This model tracks all notifications sent to users regarding KYC status,
 * expiration warnings, and re-verification requirements for audit trails.
 */
const KycNotification = sequelize.define('KycNotification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User wallet address',
  },
  kyc_status_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'kyc_statuses',
      key: 'id'
    },
    comment: 'Associated KYC status record',
  },
  notification_type: {
    type: DataTypes.ENUM('EXPIRATION_WARNING', 'EXPIRED', 'SOFT_LOCK', 'REVERIFY_REQUIRED', 'VERIFICATION_COMPLETE', 'MANUAL_REVIEW'),
    allowNull: false,
    comment: 'Type of notification sent',
  },
  urgency_level: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
    allowNull: false,
    comment: 'Urgency level of the notification',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Notification title',
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Notification message content',
  },
  channels: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: [],
    comment: 'Channels through which notification was sent (email, push, sms, in_app)',
  },
  delivery_status: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
    comment: 'Delivery status per channel (sent, failed, pending)',
  },
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when notification was sent',
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when notification was read by user',
  },
  action_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether user action is required',
  },
  action_type: {
    type: DataTypes.ENUM('REVERIFY_KYC', 'UPDATE_DOCUMENTS', 'CONTACT_SUPPORT', 'REVIEW_STATUS'),
    allowNull: true,
    comment: 'Type of action required from user',
  },
  action_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL for user to take required action',
  },
  action_deadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Deadline for user to take action',
  },
  days_until_expiration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Days until KYC expiration at time of notification',
  },
  kyc_status_at_notification: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'KYC status at time notification was sent',
  },
  expiration_date_at_notification: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'KYC expiration date at time of notification',
  },
  template_used: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Notification template identifier used',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the notification',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if notification delivery failed',
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of delivery retry attempts',
  },
  next_retry_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp for next retry attempt',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'kyc_notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_address'],
    },
    {
      fields: ['kyc_status_id'],
    },
    {
      fields: ['notification_type'],
    },
    {
      fields: ['urgency_level'],
    },
    {
      fields: ['sent_at'],
    },
    {
      fields: ['action_required'],
    },
    {
      fields: ['delivery_status'],
    },
    {
      fields: ['read_at'],
    },
  ],
});

// Instance methods
KycNotification.prototype.markAsRead = async function() {
  await this.update({
    read_at: new Date(),
    updated_at: new Date()
  });
  return this;
};

KycNotification.prototype.updateDeliveryStatus = async function(channel, status, errorMessage = null) {
  const deliveryStatus = this.delivery_status || {};
  deliveryStatus[channel] = {
    status,
    timestamp: new Date(),
    error_message: errorMessage
  };
  
  await this.update({
    delivery_status: deliveryStatus,
    error_message: errorMessage || this.error_message,
    updated_at: new Date()
  });
  
  return this;
};

KycNotification.prototype.incrementRetry = async function(nextRetryDelay = 3600000) { // 1 hour default
  const retryCount = this.retry_count + 1;
  const nextRetryAt = new Date(Date.now() + nextRetryDelay);
  
  await this.update({
    retry_count: retryCount,
    next_retry_at: nextRetryAt,
    updated_at: new Date()
  });
  
  return this;
};

KycNotification.prototype.isExpired = function() {
  if (!this.action_deadline) return false;
  return new Date() > new Date(this.action_deadline);
};

KycNotification.prototype.requiresRetry = function() {
  const failedChannels = Object.entries(this.delivery_status || {})
    .filter(([channel, status]) => status.status === 'failed' && this.retry_count < 3);
  
  return failedChannels.length > 0;
};

// Class methods
KycNotification.findByUser = async function(userAddress, options = {}) {
  const { limit = 50, offset = 0, unreadOnly = false, type } = options;
  
  const whereClause = { user_address: userAddress };
  
  if (unreadOnly) {
    whereClause.read_at = null;
  }
  
  if (type) {
    whereClause.notification_type = type;
  }
  
  return await this.findAll({
    where: whereClause,
    order: [['sent_at', 'DESC']],
    limit,
    offset
  });
};

KycNotification.createNotification = async function({
  userAddress,
  kycStatusId,
  notificationType,
  urgencyLevel,
  title,
  message,
  channels = ['in_app'],
  actionRequired = true,
  actionType,
  actionUrl,
  actionDeadline,
  daysUntilExpiration,
  kycStatusAtNotification,
  expirationDateAtNotification,
  templateUsed,
  metadata
}) {
  return await this.create({
    user_address: userAddress,
    kyc_status_id: kycStatusId,
    notification_type: notificationType,
    urgency_level: urgencyLevel,
    title,
    message,
    channels,
    action_required: actionRequired,
    action_type: actionType,
    action_url: actionUrl,
    action_deadline: actionDeadline,
    days_until_expiration: daysUntilExpiration,
    kyc_status_at_notification: kycStatusAtNotification,
    expiration_date_at_notification: expirationDateAtNotification,
    template_used: templateUsed,
    metadata
  });
};

KycNotification.findPendingRetries = async function() {
  const now = new Date();
  
  return await this.findAll({
    where: {
      next_retry_at: {
        [require('sequelize').Op.lte]: now
      },
      retry_count: {
        [require('sequelize').Op.lt]: 3
      }
    },
    include: [{
      model: require('.').KycStatus,
      as: 'kycStatus'
    }],
    order: [['next_retry_at', 'ASC']]
  });
};

KycNotification.getNotificationStatistics = async function(userAddress = null, timeRange = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeRange);
  
  const whereClause = {
    sent_at: {
      [require('sequelize').Op.gte]: startDate
    }
  };
  
  if (userAddress) {
    whereClause.user_address = userAddress;
  }
  
  const totalNotifications = await this.count({ where: whereClause });
  const readNotifications = await this.count({ 
    where: { ...whereClause, read_at: { [require('sequelize').Op.not]: null } } 
  });
  const actionRequiredNotifications = await this.count({ 
    where: { ...whereClause, action_required: true } 
  });
  
  const typeBreakdown = await this.findAll({
    attributes: [
      'notification_type',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
    ],
    where: whereClause,
    group: ['notification_type'],
    raw: true
  });

  const urgencyBreakdown = await this.findAll({
    attributes: [
      'urgency_level',
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
    ],
    where: whereClause,
    group: ['urgency_level'],
    raw: true
  });

  const deliveryStats = await this.findAll({
    attributes: [
      [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'total'],
      [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN delivery_status->>'email' = '\"sent\" THEN 1 ELSE 0 END")), 'email_sent'],
      [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN delivery_status->>'push' = '\"sent\" THEN 1 ELSE 0 END")), 'push_sent'],
      [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN delivery_status->>'sms' = '\"sent\" THEN 1 ELSE 0 END")), 'sms_sent'],
      [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN delivery_status->>'in_app' = '\"sent\" THEN 1 ELSE 0 END")), 'in_app_sent']
    ],
    where: whereClause,
    raw: true
  });

  return {
    totalNotifications,
    readNotifications,
    readRate: totalNotifications > 0 ? ((readNotifications / totalNotifications) * 100).toFixed(2) : '0.00',
    actionRequiredNotifications,
    typeBreakdown: typeBreakdown.reduce((acc, item) => {
      acc[item.notification_type] = parseInt(item.count);
      return acc;
    }, {}),
    urgencyBreakdown: urgencyBreakdown.reduce((acc, item) => {
      acc[item.urgency_level] = parseInt(item.count);
      return acc;
    }, {}),
    deliveryStats: deliveryStats[0] || {
      total: 0,
      email_sent: 0,
      push_sent: 0,
      sms_sent: 0,
      in_app_sent: 0
    }
  };
};

// Add association method
KycNotification.associate = function (models) {
  KycNotification.belongsTo(models.KycStatus, {
    foreignKey: 'kyc_status_id',
    as: 'kycStatus'
  });
};

module.exports = KycNotification;
