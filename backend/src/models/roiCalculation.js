const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * ROI Calculation Model
 * Stores calculated ROI metrics for users, vaults, and grant streams
 * Provides historical tracking of performance over time
 */
const RoiCalculation = sequelize.define('RoiCalculation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User wallet address (for user-level calculations)',
  },
  vault_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Associated vault ID (for vault-level calculations)',
    references: {
      model: 'vaults',
      key: 'id'
    }
  },
  grant_stream_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated grant stream ID (for grant-level calculations)',
    references: {
      model: 'grant_streams',
      key: 'id'
    }
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token contract address',
  },
  calculation_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when this ROI calculation was performed',
  },
  grant_price_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Token price in USD at the time of grant',
  },
  current_price_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Current token price in USD at calculation time',
  },
  total_allocated: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total tokens allocated',
  },
  total_withdrawn: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total tokens withdrawn',
  },
  current_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Current token balance',
  },
  investment_value_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total USD value invested (allocated * grant price)',
  },
  current_value_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Current USD value (balance * current price)',
  },
  realized_value_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'USD value of withdrawn tokens',
  },
  total_value_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total USD value (current + realized)',
  },
  unrealized_gains_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Unrealized gains in USD',
  },
  realized_gains_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Realized gains in USD',
  },
  total_gains_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total gains in USD (unrealized + realized)',
  },
  roi_percentage: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 0,
    comment: 'Return on Investment percentage',
  },
  price_change_percentage: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
    defaultValue: 0,
    comment: 'Price change percentage from grant to current',
  },
  calculation_type: {
    type: DataTypes.ENUM('user', 'vault', 'grant_stream'),
    allowNull: false,
    comment: 'Type of ROI calculation',
  },
  data_quality: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
    allowNull: false,
    defaultValue: 'good',
    comment: 'Quality rating of the calculation data',
  },
  price_source: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'oracle',
    comment: 'Source of current price data',
  },
  confidence_score: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 0.8000,
    comment: 'Confidence score for the calculation (0.0000 - 1.0000)',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional calculation metadata and breakdown',
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
  tableName: 'roi_calculations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_address'],
    },
    {
      fields: ['vault_id'],
    },
    {
      fields: ['grant_stream_id'],
    },
    {
      fields: ['token_address'],
    },
    {
      fields: ['calculation_date'],
    },
    {
      fields: ['calculation_type'],
    },
    {
      fields: ['user_address', 'calculation_date'],
    },
    {
      fields: ['vault_id', 'calculation_date'],
    },
    {
      fields: ['grant_stream_id', 'calculation_date'],
    },
    {
      fields: ['token_address', 'calculation_date'],
    },
  ],
});

RoiCalculation.associate = function (models) {
  RoiCalculation.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });

  RoiCalculation.belongsTo(models.GrantStream, {
    foreignKey: 'grant_stream_id',
    as: 'grantStream'
  });

  RoiCalculation.belongsTo(models.Token, {
    foreignKey: 'token_address',
    sourceKey: 'address',
    as: 'token'
  });
};

module.exports = RoiCalculation;
