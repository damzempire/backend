const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const ClaimsHistory = sequelize.define('ClaimsHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  amount_claimed: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
  },
  claim_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  block_number: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  event_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Event index within the transaction for idempotency',
  },
  price_at_claim_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Token price in USD at the time of claim for realized gains calculation',
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
  tableName: 'claims_history',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_address'],
    },
    {
      fields: ['token_address'],
    },
    {
      fields: ['claim_timestamp'],
    },
    {
      fields: ['transaction_hash', 'event_index'],
      unique: true,
    },
  ],
});

// Add association method
ClaimsHistory.associate = function (models) {
  ClaimsHistory.belongsTo(models.Token, {
    foreignKey: 'token_address',
    sourceKey: 'address',
    as: 'token'
  });
};

module.exports = ClaimsHistory;
