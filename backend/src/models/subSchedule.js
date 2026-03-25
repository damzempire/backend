const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const SubSchedule = sequelize.define('SubSchedule', {
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
  top_up_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Amount of tokens added in this top-up',
  },
  cliff_duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Cliff duration in seconds',
  },
  cliff_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  vesting_start_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  vesting_duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Vesting duration in seconds',
  },
  start_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When vesting starts',
  },
  end_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'When vesting ends',
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Transaction hash for this top-up',
  },
  amount_withdrawn: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount withdrawn from this sub-schedule',
  },
  cumulative_claimed_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Cumulative amount claimed to prevent dust loss from integer division truncation',
  },
  amount_released: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  block_number: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Ledger sequence number where this top-up was confirmed',
  },
}, {
  tableName: 'sub_schedules',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_id'],
    },

  ],
});

SubSchedule.associate = function (models) {
  SubSchedule.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });
};

module.exports = SubSchedule;
