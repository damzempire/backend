const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const ContractUpgradeSignature = sequelize.define('ContractUpgradeSignature', {
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
  signer_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Address of the signer',
  },
  signature: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Signature of the approval',
  },
  decision: {
    type: DataTypes.ENUM('approve', 'reject'),
    allowNull: false,
    comment: 'Decision of the signer',
  },
  signing_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Optional reason for the decision',
  },
  is_valid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the signature is valid',
  },
  validation_error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if signature validation failed',
  },
  signed_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When the signature was created',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the signature expires',
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
  tableName: 'contract_upgrade_signatures',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['proposal_id'],
    },
    {
      fields: ['signer_address'],
    },
    {
      fields: ['decision'],
    },
    {
      fields: ['is_valid'],
    },
    {
      fields: ['expires_at'],
    },
    {
      unique: true,
      fields: ['proposal_id', 'signer_address'],
    },
  ],
});

// Add association method
ContractUpgradeSignature.associate = function (models) {
  ContractUpgradeSignature.belongsTo(models.ContractUpgradeProposal, {
    foreignKey: 'proposal_id',
    as: 'proposal'
  });
};

module.exports = ContractUpgradeSignature;
