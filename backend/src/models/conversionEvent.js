const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const ConversionEvent = sequelize.define('ConversionEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Stellar transaction hash for the path payment',
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Beneficiary wallet address who performed the conversion',
  },
  claim_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Associated claim history ID if this is a claim-and-swap',
  },
  source_asset_code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Source asset code (e.g., "TOKEN", "XLM")',
  },
  source_asset_issuer: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Source asset issuer address (null for XLM)',
  },
  source_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Amount of source asset sent',
  },
  destination_asset_code: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Destination asset code (e.g., "USDC", "XLM")',
  },
  destination_asset_issuer: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Destination asset issuer address (null for XLM)',
  },
  destination_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Amount of destination asset received',
  },
  exchange_rate: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Exchange rate (destination_amount / source_amount)',
  },
  exchange_rate_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Exchange rate in USD terms (for non-USD pairs)',
  },
  path_assets: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of intermediate assets in the path payment',
  },
  slippage_percentage: {
    type: DataTypes.DECIMAL(10, 6),
    allowNull: true,
    comment: 'Slippage percentage from quoted price',
  },
  gas_fee_xlm: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Gas fee paid in XLM for this transaction',
  },
  block_number: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Stellar ledger sequence number',
  },
  transaction_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Timestamp when the transaction was included in the ledger',
  },
  conversion_type: {
    type: DataTypes.ENUM('claim_and_swap', 'direct_swap', 'arbitrage'),
    allowNull: false,
    defaultValue: 'direct_swap',
    comment: 'Type of conversion event',
  },
  price_source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'stellar_dex',
    comment: 'Source of the price data (stellar_dex, oracle, etc.)',
  },
  data_quality: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
    allowNull: false,
    defaultValue: 'good',
    comment: 'Quality of the price data based on liquidity and depth',
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
  tableName: 'conversion_events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['transaction_hash'],
      unique: true,
    },
    {
      fields: ['user_address'],
    },
    {
      fields: ['claim_id'],
    },
    {
      fields: ['source_asset_code', 'source_asset_issuer'],
    },
    {
      fields: ['destination_asset_code', 'destination_asset_issuer'],
    },
    {
      fields: ['transaction_timestamp'],
    },
    {
      fields: ['conversion_type'],
    },
    {
      fields: ['block_number'],
    },
  ],
});

ConversionEvent.associate = function (models) {
  // Association with ClaimsHistory
  ConversionEvent.belongsTo(models.ClaimsHistory, {
    foreignKey: 'claim_id',
    sourceKey: 'id',
    as: 'claim',
  });

  // Association with Token model for source asset
  ConversionEvent.belongsTo(models.Token, {
    foreignKey: ['source_asset_code', 'source_asset_issuer'],
    sourceKey: ['code', 'issuer'],
    as: 'sourceToken',
    constraints: false,
  });

  // Association with Token model for destination asset
  ConversionEvent.belongsTo(models.Token, {
    foreignKey: ['destination_asset_code', 'destination_asset_issuer'],
    sourceKey: ['code', 'issuer'],
    as: 'destinationToken',
    constraints: false,
  });
};

module.exports = ConversionEvent;
