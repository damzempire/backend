const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const MultiSigConfig = sequelize.define('MultiSigConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_address: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Vault contract address',
  },
  required_signatures: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2,
    comment: 'Number of signatures required for revocation',
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
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether multi-sig configuration is active',
  },
  created_by: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Admin address who created this configuration',
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
  tableName: 'multi_sig_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_address'],
      unique: true,
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['created_by'],
    },
  ],
});

module.exports = MultiSigConfig;
