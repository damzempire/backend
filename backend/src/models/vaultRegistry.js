const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const VaultRegistry = sequelize.define('VaultRegistry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contract_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Stellar contract address/hash of the vault',
  },
  project_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Human-readable project name for the vault',
  },
  creator_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Address of the vault creator/owner',
  },
  deployment_ledger: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Ledger number when the vault was deployed',
  },
  deployment_transaction_hash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Transaction hash of vault deployment',
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Token address associated with the vault',
  },
  vault_type: {
    type: DataTypes.ENUM('standard', 'cliff', 'dynamic'),
    allowNull: false,
    defaultValue: 'standard',
    comment: 'Type of vault contract',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether this vault is currently active',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata about the vault',
  },
  discovered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    comment: 'When this vault was discovered by the indexer',
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
  },
}, {
  tableName: 'vault_registry',
  timestamps: true,
  createdAt: 'discovered_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['contract_id'],
      unique: true,
    },
    {
      fields: ['creator_address'],
    },
    {
      fields: ['project_name'],
    },
    {
      fields: ['deployment_ledger'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['created_at'],
    },
  ],
});

// Association method
VaultRegistry.associate = function (models) {
  // We can associate with the main Vault model if needed
  VaultRegistry.belongsTo(models.Vault, {
    foreignKey: 'contract_id',
    targetKey: 'address',
    as: 'vaultDetails'
  });
};

module.exports = VaultRegistry;
