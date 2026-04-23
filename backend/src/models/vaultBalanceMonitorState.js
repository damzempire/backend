const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const VaultBalanceMonitorState = sequelize.define('VaultBalanceMonitorState', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'vaults',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('healthy', 'discrepancy', 'error'),
    allowNull: false,
    defaultValue: 'healthy',
  },
  last_checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_alerted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_discrepancy_signature: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  last_on_chain_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
  },
  last_expected_unvested_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
  },
  last_expected_unclaimed_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
  },
  last_difference: {
    type: DataTypes.DECIMAL(36, 18),
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
  tableName: 'vault_balance_monitor_states',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_id'],
      unique: true,
    },
    {
      fields: ['status'],
    },
    {
      fields: ['token_address'],
    },
  ],
});

VaultBalanceMonitorState.associate = function associate(models) {
  VaultBalanceMonitorState.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });
};

module.exports = VaultBalanceMonitorState;
