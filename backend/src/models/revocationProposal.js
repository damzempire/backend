const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const RevocationProposal = sequelize.define('RevocationProposal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Vault contract address',
  },
  beneficiary_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Beneficiary wallet address to revoke from',
  },
  amount_to_revoke: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Amount of tokens to revoke',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Reason for revocation proposal',
  },
  proposed_by: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Admin address who initiated the proposal',
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'executed', 'failed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Proposal status',
  },
  required_signatures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    comment: 'Number of signatures required for approval',
  },
  current_signatures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Current number of collected signatures',
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Transaction hash of executed revocation',
  },
  executed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when proposal was executed',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Proposal expiration timestamp',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata for the proposal',
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
  tableName: 'revocation_proposals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_address'],
    },
    {
      fields: ['beneficiary_address'],
    },
    {
      fields: ['proposed_by'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['expires_at'],
    },
    {
      fields: ['created_at'],
    },
    {
      fields: ['vault_address', 'status'],
    },
  ],
});

module.exports = RevocationProposal;
