const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * Grant Price Snapshot Model
 * Stores price snapshots at the time of grant allocation
 * Used for ROI calculations and historical price tracking
 */
const GrantPriceSnapshot = sequelize.define('GrantPriceSnapshot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Associated vault ID (if this is a vault grant)',
    references: {
      model: 'vaults',
      key: 'id'
    }
  },
  grant_stream_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Associated grant stream ID (if this is a grant stream)',
    references: {
      model: 'grant_streams',
      key: 'id'
    }
  },
  beneficiary_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Beneficiary wallet address (if applicable)',
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token contract address',
  },
  grant_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Amount of tokens granted at this snapshot',
  },
  grant_price_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Token price in USD at the time of grant',
  },
  grant_value_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Total USD value of the grant at time of grant (amount * price)',
  },
  grant_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when the grant was made',
  },
  price_source: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'oracle',
    comment: 'Source of the price data (oracle, stellar_dex, coingecko, etc.)',
  },
  confidence_score: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    defaultValue: 0.8000,
    comment: 'Confidence score for the price data (0.0000 - 1.0000)',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the grant and price data',
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
  tableName: 'grant_price_snapshots',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_id'],
    },
    {
      fields: ['grant_stream_id'],
    },
    {
      fields: ['beneficiary_address'],
    },
    {
      fields: ['token_address'],
    },
    {
      fields: ['grant_date'],
    },
    {
      fields: ['price_source'],
    },
    {
      fields: ['vault_id', 'grant_date'],
    },
    {
      fields: ['grant_stream_id', 'grant_date'],
    },
    {
      fields: ['token_address', 'grant_date'],
    },
  ],
});

GrantPriceSnapshot.associate = function (models) {
  GrantPriceSnapshot.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });

  GrantPriceSnapshot.belongsTo(models.GrantStream, {
    foreignKey: 'grant_stream_id',
    as: 'grantStream'
  });

  GrantPriceSnapshot.belongsTo(models.Token, {
    foreignKey: 'token_address',
    sourceKey: 'address',
    as: 'token'
  });
};

module.exports = GrantPriceSnapshot;
