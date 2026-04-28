const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const CleanupTask = sequelize.define('CleanupTask', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
  vault_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Vault address on Stellar blockchain',
  },
  owner_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Original vault owner address',
  },
  total_vested_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Total amount that was vested in the vault',
  },
  vesting_completion_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when vesting schedule completed',
  },
  platform_fee_paid: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Platform fee originally paid for this vault',
  },
  bounty_reward_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Reward amount available for cleanup (calculated from platform fee)',
  },
  bounty_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10,
    comment: 'Percentage of platform fee returned as bounty reward (default 10%)',
  },
  status: {
    type: DataTypes.ENUM('pending', 'claimed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Status of the cleanup task: pending, claimed, or cancelled',
  },
  claimed_by_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Address of user who claimed the cleanup reward',
  },
  claimed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when reward was claimed',
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Stellar transaction hash for finalize_and_delete contract call',
  },
  ledger_sequence: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Stellar ledger sequence number for confirmation',
  },
  is_empty_vault: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether vault has zero remaining balance',
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
  tableName: 'cleanup_tasks',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_id'],
    },
    {
      fields: ['owner_address'],
    },
    {
      fields: ['vault_address'],
      unique: true,
    },
    {
      fields: ['status'],
    },
    {
      fields: ['claimed_by_address'],
    },
  ],
});

CleanupTask.associate = function (models) {
  CleanupTask.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });
};

module.exports = CleanupTask;
