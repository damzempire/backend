const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const HistoricalTokenPrice = sequelize.define('HistoricalTokenPrice', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token contract address',
  },
  price_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date for this price data (YYYY-MM-DD)',
  },
  price_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Token price in USD',
  },
  vwap_24h_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: '24-hour Volume Weighted Average Price in USD',
  },
  volume_24h_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: '24-hour trading volume in USD',
  },
  market_cap_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Market capitalization in USD',
  },
  price_source: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'stellar_dex',
    comment: 'Source of price data',
  },
  data_quality: {
    type: DataTypes.ENUM('excellent', 'good', 'fair', 'poor'),
    allowNull: false,
    defaultValue: 'good',
    comment: 'Quality rating of price data',
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
  tableName: 'historical_token_prices',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['token_address'],
    },
    {
      fields: ['price_date'],
    },
    {
      fields: ['token_address', 'price_date'],
    },
    {
      fields: ['price_source'],
    },
    {
      fields: ['token_address', 'price_date', 'price_source'],
      unique: true,
    },
  ],
});

HistoricalTokenPrice.associate = function (models) {
  HistoricalTokenPrice.belongsTo(models.Token, {
    foreignKey: 'token_address',
    sourceKey: 'address',
    as: 'token'
  });
};

module.exports = HistoricalTokenPrice;