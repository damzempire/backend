const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
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
    allowNull: true,
    references: {
      model: 'sub_schedules',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of notification, e.g., CLIFF_PASSED',
  },
  sent_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['beneficiary_id', 'vault_id', 'sub_schedule_id', 'type'],
      unique: true,
    },
  ],
});

module.exports = Notification;
