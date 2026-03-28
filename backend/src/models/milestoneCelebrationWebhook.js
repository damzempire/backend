const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const MilestoneCelebrationWebhook = sequelize.define('MilestoneCelebrationWebhook', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'organizations',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  webhook_url: {
    type: DataTypes.STRING(512),
    allowNull: false,
    comment: 'Discord/Telegram bot webhook URL',
  },
  webhook_type: {
    type: DataTypes.ENUM('discord', 'telegram', 'custom'),
    allowNull: false,
    defaultValue: 'discord',
    comment: 'Type of webhook endpoint',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this webhook is currently active',
  },
  secret_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Optional secret for webhook signature validation',
  },
  milestone_types: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: ['cliff_end', 'vesting_complete'],
    comment: 'Array of milestone types to trigger webhooks for',
  },
  min_amount_threshold: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    defaultValue: 0,
    comment: 'Minimum vested amount to trigger celebration',
  },
  custom_message_template: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Custom message template for celebrations',
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
  tableName: 'milestone_celebration_webhooks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['organization_id'],
    },
    {
      fields: ['webhook_type'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['webhook_url'],
    },
  ],
});

MilestoneCelebrationWebhook.associate = function (models) {
  MilestoneCelebrationWebhook.belongsTo(models.Organization, {
    foreignKey: 'organization_id',
    as: 'organization'
  });
};

module.exports = MilestoneCelebrationWebhook;
