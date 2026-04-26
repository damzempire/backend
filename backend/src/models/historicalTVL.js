const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const HistoricalTVL = sequelize.define('HistoricalTVL', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  snapshot_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date of the TVL snapshot (YYYY-MM-DD)',
  },
  total_value_locked: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total value locked across all active vaults at snapshot time',
  },
  active_vaults_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of active vaults at snapshot time',
  },
  tvl_change_24h: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'TVL change in the last 24 hours (USD)',
  },
  tvl_change_percentage_24h: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'TVL change percentage in the last 24 hours',
  },
  total_vault_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total balance across all vaults (raw token amount)',
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Primary token address for the vaults (if applicable)',
  },
  snapshot_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Exact timestamp when snapshot was taken',
  },
  data_quality: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
    allowNull: false,
    defaultValue: 'good',
    comment: 'Quality rating of the TVL snapshot data',
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
  tableName: 'historical_tvl',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['snapshot_date'],
    },
    {
      fields: ['snapshot_timestamp'],
    },
    {
      fields: ['token_address'],
    },
    {
      fields: ['snapshot_date', 'token_address'],
    },
    {
      fields: ['snapshot_date'],
      unique: true,
    },
  ],
});

module.exports = HistoricalTVL;
