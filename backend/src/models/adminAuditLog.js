const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const AdminAuditLog = sequelize.define('AdminAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  admin_pubkey: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Public key of the admin who performed the action',
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Type of action performed (e.g., CREATE_VESTING_SCHEDULE, REVOKE_GRANT, APPROVE_KYC)',
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'IP address from which the action was performed',
  },
  payload: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'The exact payload submitted for the action',
  },
  resource_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the resource affected (e.g., schedule_id, beneficiary_id)',
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
}, {
  tableName: 'admin_audit_logs',
  timestamps: false, // Using timestamp column instead
  indexes: [
    {
      fields: ['admin_pubkey'],
    },
    {
      fields: ['action'],
    },
    {
      fields: ['timestamp'],
    },
    {
      fields: ['resource_id'],
    },
  ],
});

module.exports = AdminAuditLog;
