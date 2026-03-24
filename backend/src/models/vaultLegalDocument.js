const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const VaultLegalDocument = sequelize.define('VaultLegalDocument', {
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
  document_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'TOKEN_PURCHASE_AGREEMENT',
  },
  document_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mime_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'application/pdf',
  },
  file_size_bytes: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  sha256_hash: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  uploaded_by: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  last_verified_at: {
    type: DataTypes.DATE,
    allowNull: true,
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
  tableName: 'vault_legal_documents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['vault_id', 'document_type'],
    },
    {
      fields: ['sha256_hash'],
    },
  ],
});

VaultLegalDocument.associate = function(models) {
  VaultLegalDocument.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault',
  });
};

module.exports = VaultLegalDocument;
