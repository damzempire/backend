const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const DividendRound = sequelize.define('DividendRound', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token address paying dividends',
  },
  total_dividend_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Total amount of dividend being distributed',
  },
  dividend_token: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token used for dividend payment (USDC, XLM, etc.)',
  },
  snapshot_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Timestamp when holder snapshot was taken',
  },
  calculation_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when calculations were performed',
  },
  distribution_timestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when distribution was completed',
  },
  status: {
    type: DataTypes.ENUM('pending', 'calculating', 'ready', 'distributing', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Status of the dividend round',
  },
  total_eligible_holders: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of eligible vault holders',
  },
  total_eligible_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total eligible token balance across all vaults',
  },
  vested_treatment: {
    type: DataTypes.ENUM('full', 'proportional', 'vested_only'),
    allowNull: false,
    defaultValue: 'full',
    comment: 'How vested vs unvested tokens are treated',
  },
  unvested_multiplier: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 1.0,
    comment: 'Multiplier for unvested tokens (0.0-1.0)',
  },
  distribution_mechanism: {
    type: DataTypes.ENUM('side_drip', 'claim', 'reinvest'),
    allowNull: false,
    defaultValue: 'side_drip',
    comment: 'How dividends are distributed',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the dividend round',
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Admin address who created this dividend round',
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
  tableName: 'dividend_rounds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['token_address'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['snapshot_timestamp'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['token_address', 'status'],
    },
  ],
});

module.exports = DividendRound;
