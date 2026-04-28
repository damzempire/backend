const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const RevocationSignature = sequelize.define('RevocationSignature', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  proposal_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'revocation_proposals',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Associated revocation proposal ID',
  },
  signer_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Admin address who signed the proposal',
  },
  signature: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Cryptographic signature of the proposal payload',
  },
  signed_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Timestamp when signature was created',
  },
  is_valid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether the signature is valid',
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional signature metadata',
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
  tableName: 'revocation_signatures',
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
      fields: ['signed_at'],
    },
    {
      fields: ['is_valid'],
    },
    {
      fields: ['proposal_id', 'signer_address'],
      unique: true,
    },
  ],
});

module.exports = RevocationSignature;
