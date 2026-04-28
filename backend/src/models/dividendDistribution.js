const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const DividendDistribution = sequelize.define('DividendDistribution', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  dividend_round_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'dividend_rounds',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Associated dividend round ID',
  },
  vault_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Vault contract address',
  },
  beneficiary_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Beneficiary wallet address',
  },
  held_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Token balance held at snapshot time',
  },
  vested_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Vested portion of held balance',
  },
  unvested_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Unvested portion of held balance',
  },
  eligible_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Balance eligible for dividend after treatment rules',
  },
  pro_rata_share: {
    type: DataTypes.DECIMAL(18, 8),
    allowNull: false,
    comment: 'Pro-rata share percentage (0.00000000 - 1.00000000)',
  },
  dividend_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Calculated dividend amount for this beneficiary',
  },
  status: {
    type: DataTypes.ENUM('pending', 'calculated', 'sent', 'failed', 'claimed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Status of this specific distribution',
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Transaction hash of the dividend transfer',
  },
  distributed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when dividend was distributed',
  },
  claimed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when dividend was claimed (if claim mechanism)',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if distribution failed',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional distribution metadata',
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
  tableName: 'dividend_distributions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['dividend_round_id'],
    },
    {
      fields: ['vault_address'],
    },
    {
      fields: ['beneficiary_address'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['distributed_at'],
    },
    {
      fields: ['dividend_round_id', 'beneficiary_address'],
    },
    {
      fields: ['dividend_round_id', 'status'],
    },
  ],
});

module.exports = DividendDistribution;
