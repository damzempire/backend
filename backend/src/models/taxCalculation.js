const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');
const BigNumber = require('bignumber.js');

/**
 * TaxCalculation Model
 * Stores individual tax liability assessments for vesting and claim events.
 */
const TaxCalculation = sequelize.define('TaxCalculation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
    index: true,
  },
  vault_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  jurisdiction_code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tax_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  event_type: {
    type: DataTypes.ENUM('VESTING', 'CLAIM', 'SELL'),
    allowNull: false,
  },
  token_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
  },
  token_price_usd: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: false,
  },
  total_value_usd: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
  },
  tax_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  tax_liability_usd: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false,
  },
  withholding_tokens_estimate: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Estimated tokens needed for Sell-to-Cover'
  },
  oracle_source: {
    type: DataTypes.STRING,
    defaultValue: 'INTERNAL_FALLBACK',
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
    defaultValue: 'PENDING',
  }
}, {
  tableName: 'tax_calculations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['user_address', 'tax_year'] },
    { fields: ['vault_id'] }
  ]
});

module.exports = TaxCalculation;