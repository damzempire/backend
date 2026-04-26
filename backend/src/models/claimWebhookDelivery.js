const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const ClaimWebhookDelivery = sequelize.define('ClaimWebhookDelivery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_webhook_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'organization_webhooks',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  event_type: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: 'tokens_claimed',
  },
  event_key: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  beneficiary_address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  target_url: {
    type: DataTypes.STRING(512),
    allowNull: false,
  },
  payload: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  payload_signature: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  delivery_status: {
    type: DataTypes.ENUM('pending', 'retrying', 'success', 'failed', 'skipped'),
    allowNull: false,
    defaultValue: 'pending',
  },
  attempt_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  last_attempt_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  next_attempt_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_http_status: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  last_response_body: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  last_error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  tableName: 'claim_webhook_deliveries',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['organization_webhook_id', 'event_key'],
      unique: true,
    },
    {
      fields: ['delivery_status'],
    },
    {
      fields: ['transaction_hash'],
    },
    {
      fields: ['next_attempt_at'],
    },
  ],
});

ClaimWebhookDelivery.associate = function associate(models) {
  ClaimWebhookDelivery.belongsTo(models.OrganizationWebhook, {
    foreignKey: 'organization_webhook_id',
    as: 'webhook',
  });
};

module.exports = ClaimWebhookDelivery;
