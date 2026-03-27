const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const CleanupReward = sequelize.define('CleanupReward', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  cleanup_task_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cleanup_tasks',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  vault_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vaults',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  claimer_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Address that claimed the cleanup reward',
  },
  reward_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Exact reward amount paid out',
  },
  claimed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp of reward claim',
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Stellar transaction hash for reward transfer',
  },
  ledger_sequence: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Stellar ledger sequence number for confirmation',
  },
  block_timestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Blockchain timestamp of the transaction',
  },
  reward_status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Status of reward transfer: pending, confirmed, or failed',
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about the reward claim',
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
  tableName: 'cleanup_rewards',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['cleanup_task_id'],
    },
    {
      fields: ['vault_id'],
    },
    {
      fields: ['claimer_address'],
    },
    {
      fields: ['transaction_hash'],
      unique: true,
    },
    {
      fields: ['reward_status'],
    },
    {
      fields: ['claimed_at'],
    },
  ],
});

CleanupReward.associate = function (models) {
  CleanupReward.belongsTo(models.CleanupTask, {
    foreignKey: 'cleanup_task_id',
    as: 'cleanupTask'
  });
  CleanupReward.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });
};

module.exports = CleanupReward;
