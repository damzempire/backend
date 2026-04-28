const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const VaultLiquidityAlert = sequelize.define('VaultLiquidityAlert', {
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
    type: DataTypes.ENUM('healthy', 'alerting', 'unavailable'),
    allowNull: false,
    defaultValue: 'healthy',
  },
  quote_asset: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  last_checked_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_alerted_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  last_slippage: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: true,
  },
  reference_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
  },
  execution_price: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
  },
  sell_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
  },
  quote_amount_received: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
  },
  insufficient_depth: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  error_message: {
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
  tableName: 'vault_liquidity_alerts',
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

VaultLiquidityAlert.associate = function(models) {
  VaultLiquidityAlert.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });
};

module.exports = VaultLiquidityAlert;
