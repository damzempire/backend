const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const ContractUpgradeProposal = sequelize.define('ContractUpgradeProposal', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Vault contract address to be upgraded',
  },
  current_wasm_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Current WASM hash of the contract',
  },
  proposed_wasm_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Proposed new WASM hash',
  },
  upgrade_reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Detailed reason for the upgrade',
  },
  certified_build_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'ID of the certified build verification',
  },
  proposed_by: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Admin address proposing the upgrade',
  },
  status: {
    type: DataTypes.ENUM('proposed', 'pending_verification', 'verified', 'pending_approval', 'approved', 'rejected', 'executed', 'failed'),
    allowNull: false,
    defaultValue: 'proposed',
    comment: 'Current status of the upgrade proposal',
  },
  required_signatures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    comment: 'Number of signatures required for approval',
  },
  total_signers: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    comment: 'Total number of authorized signers',
  },
  signers: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: 'Array of authorized signer addresses',
  },
  immutable_terms_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Hash of immutable terms to ensure they are preserved',
  },
  verification_result: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Results of WASM hash verification',
  },
  execution_tx_hash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Transaction hash of the executed upgrade',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiration time for the proposal',
  },
  executed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the upgrade was executed',
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
  tableName: 'contract_upgrade_proposals',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_address'],
    },
    {
      fields: ['status'],
    },
    {
      fields: ['proposed_by'],
    },
    {
      fields: ['proposed_wasm_hash'],
    },
    {
      fields: ['expires_at'],
    },
  ],
});

// Add association method
ContractUpgradeProposal.associate = function (models) {
  ContractUpgradeProposal.belongsTo(models.Vault, {
    foreignKey: 'vault_address',
    targetKey: 'address',
    as: 'vault'
  });
  
  ContractUpgradeProposal.hasMany(models.ContractUpgradeSignature, {
    foreignKey: 'proposal_id',
    as: 'signatures'
  });

  ContractUpgradeProposal.hasMany(models.ContractUpgradeAuditLog, {
    foreignKey: 'proposal_id',
    as: 'auditLogs'
  });
};

module.exports = ContractUpgradeProposal;
