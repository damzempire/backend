const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const DividendSnapshot = sequelize.define('DividendSnapshot', {
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
  total_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Total token balance at snapshot time',
  },
  vested_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Vested balance at snapshot time',
  },
  unvested_balance: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Unvested balance at snapshot time',
  },
  cliff_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Cliff date for this beneficiary',
  },
  vesting_start_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Vesting start date for this beneficiary',
  },
  vesting_end_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Vesting end date for this beneficiary',
  },
  vesting_percentage: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false,
    defaultValue: 0,
    comment: 'Percentage of tokens vested at snapshot time',
  },
  is_eligible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this beneficiary is eligible for dividends',
  },
  ineligibility_reason: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reason for ineligibility if applicable',
  },
  snapshot_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Timestamp when snapshot was taken',
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
  tableName: 'dividend_snapshots',
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
      fields: ['is_eligible'],
    },
    {
      fields: ['snapshot_timestamp'],
    },
    {
      fields: ['dividend_round_id', 'beneficiary_address'],
    },
    {
      fields: ['dividend_round_id', 'is_eligible'],
    },
  ],
});

module.exports = DividendSnapshot;
