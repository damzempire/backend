const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const VestingMilestone = sequelize.define('VestingMilestone', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vaults',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  sub_schedule_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sub_schedules',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  beneficiary_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'beneficiaries',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  milestone_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when this vesting milestone occurred',
  },
  milestone_type: {
    type: DataTypes.ENUM('cliff_end', 'vesting_increment', 'vesting_complete'),
    allowNull: false,
    comment: 'Type of vesting milestone',
  },
  vested_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Amount vested at this specific milestone',
  },
  cumulative_vested: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Total amount vested up to this milestone',
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token contract address',
  },
  price_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Token price in USD at milestone date',
  },
  vwap_24h_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: '24-hour Volume Weighted Average Price in USD',
  },
  price_source: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Source of price data (stellar_dex, coingecko, etc.)',
  },
  price_fetched_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When price data was fetched',
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
  tableName: 'vesting_milestones',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_id'],
    },
    {
      fields: ['sub_schedule_id'],
    },
    {
      fields: ['beneficiary_id'],
    },
    {
      fields: ['milestone_date'],
    },
    {
      fields: ['token_address', 'milestone_date'],
    },
    {
      fields: ['milestone_type'],
    },
  ],
});

VestingMilestone.associate = function (models) {
  VestingMilestone.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });
  VestingMilestone.belongsTo(models.SubSchedule, {
    foreignKey: 'sub_schedule_id',
    as: 'subSchedule'
  });
  VestingMilestone.belongsTo(models.Beneficiary, {
    foreignKey: 'beneficiary_id',
    as: 'beneficiary'
  });
};

module.exports = VestingMilestone;