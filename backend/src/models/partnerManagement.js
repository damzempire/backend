const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * PartnerManagement
 * Manages institutional partners with tiered API access and usage tracking
 * Enables ecosystem-first approach with higher throughput for trusted partners
 */
const PartnerManagement = sequelize.define('PartnerManagement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  partner_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Official name of the partner organization',
  },
  partner_tier: {
    type: DataTypes.ENUM('basic', 'silver', 'gold', 'platinum', 'enterprise'),
    allowNull: false,
    defaultValue: 'basic',
    comment: 'Partner tier determining rate limits and features',
  },
  api_key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Tiered API key for partner access',
  },
  api_secret_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Hashed API secret for authentication',
  },
  contact_email: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Primary contact email for partner',
  },
  contact_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Wallet address of partner contact',
  },
  rate_limit_per_minute: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60,
    comment: 'API requests per minute allowed for this partner',
  },
  rate_limit_per_day: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10000,
    comment: 'API requests per day allowed for this partner',
  },
  max_requests_per_batch: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 100,
    comment: 'Maximum requests in a single batch',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this partner is currently active',
  },
  is_suspended: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether partner access is suspended',
  },
  suspension_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for suspension (if applicable)',
  },
  suspended_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When partner was suspended',
  },
  suspended_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Admin address that suspended the partner',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional partner metadata',
  },
  features_enabled: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    comment: 'List of premium features enabled for this partner',
  },
  custom_limits: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Custom rate limits for specific endpoints',
  },
  approved_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Admin address that approved this partner',
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When partner was approved',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When partner access expires (null for perpetual)',
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When API key was last used',
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
  tableName: 'partner_management',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['api_key'],
      unique: true,
    },
    {
      fields: ['partner_name'],
      unique: true,
    },
    {
      fields: ['partner_tier'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['contact_email'],
    },
  ],
});

/**
 * Tier configurations with default rate limits
 */
PartnerManagement.TIER_CONFIG = {
  basic: {
    rateLimitPerMinute: 60,
    rateLimitPerDay: 10000,
    maxBatchSize: 100,
    features: []
  },
  silver: {
    rateLimitPerMinute: 300,
    rateLimitPerDay: 50000,
    maxBatchSize: 500,
    features: ['priority_support']
  },
  gold: {
    rateLimitPerMinute: 1000,
    rateLimitPerDay: 200000,
    maxBatchSize: 1000,
    features: ['priority_support', 'webhook_access', 'analytics_dashboard']
  },
  platinum: {
    rateLimitPerMinute: 5000,
    rateLimitPerDay: 1000000,
    maxBatchSize: 5000,
    features: ['priority_support', 'webhook_access', 'analytics_dashboard', 'dedicated_support']
  },
  enterprise: {
    rateLimitPerMinute: 10000,
    rateLimitPerDay: -1, // Unlimited
    maxBatchSize: 10000,
    features: ['priority_support', 'webhook_access', 'analytics_dashboard', 'dedicated_support', 'custom_integrations']
  }
};

/**
 * Get partner by API key
 * @param {string} apiKey - API key
 * @returns {Promise<Object|null>} Partner record
 */
PartnerManagement.getByApiKey = async function(apiKey) {
  return await this.findOne({
    where: {
      api_key: apiKey,
      is_active: true,
      is_suspended: false
    },
    attributes: {
      exclude: ['api_secret_hash']
    }
  });
};

/**
 * Verify API key and check rate limits
 * @param {string} apiKey - API key to verify
 * @returns {Promise<Object>} Verification result with rate limit info
 */
PartnerManagement.verifyApiKey = async function(apiKey) {
  const partner = await this.getByApiKey(apiKey);

  if (!partner) {
    return {
      valid: false,
      error: 'Invalid or inactive API key'
    };
  }

  if (partner.expires_at && new Date() > partner.expires_at) {
    return {
      valid: false,
      error: 'Partner access has expired'
    };
  }

  return {
    valid: true,
    partner: partner.toJSON(),
    tierConfig: this.TIER_CONFIG[partner.partner_tier],
    rateLimits: {
      perMinute: partner.rate_limit_per_minute,
      perDay: partner.rate_limit_per_day,
      perBatch: partner.max_requests_per_batch
    }
  };
};

module.exports = PartnerManagement;
