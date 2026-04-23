const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const ContractUpgradeAuditLog = sequelize.define('ContractUpgradeAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  proposal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'contract_upgrade_proposals',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  action: {
    type: DataTypes.ENUM(
      'proposal_created',
      'verification_started',
      'verification_completed',
      'verification_failed',
      'signature_added',
      'signature_revoked',
      'proposal_approved',
      'proposal_rejected',
      'execution_started',
      'execution_completed',
      'execution_failed',
      'proposal_expired',
      'proposal_cancelled'
    ),
    allowNull: false,
    comment: 'Type of action performed',
  },
  performed_by: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Address that performed the action',
  },
  action_details: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Details of the action performed',
  },
  previous_state: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Previous state before the action',
  },
  new_state: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'New state after the action',
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'IP address of the requester',
  },
  user_agent: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'User agent of the requester',
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Related transaction hash if applicable',
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if action failed',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'contract_upgrade_audit_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    {
      fields: ['proposal_id'],
    },
    {
      fields: ['action'],
    },
    {
      fields: ['performed_by'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['transaction_hash'],
    },
  ],
});

// Add association method
ContractUpgradeAuditLog.associate = function (models) {
  ContractUpgradeAuditLog.belongsTo(models.ContractUpgradeProposal, {
    foreignKey: 'proposal_id',
    as: 'proposal'
  });
};

module.exports = ContractUpgradeAuditLog;
