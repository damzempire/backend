const { DataTypes } = require('sequelize');

const { sequelize } = require('../database/connection');


// TokenType enum
const TokenType = {
  STATIC: 'static',
  DYNAMIC: 'dynamic'
};

const Vault = sequelize.define('Vault', {

  id: {

    type: DataTypes.UUID,

    defaultValue: DataTypes.UUIDV4,

    primaryKey: true,

  },

  address: {

    type: DataTypes.STRING,

    allowNull: false,

    unique: true,

  },

  name: {

    type: DataTypes.STRING,

    allowNull: true,

  },

  token_address: {

    type: DataTypes.STRING,

    allowNull: false,

  },

  owner_address: {

    type: DataTypes.STRING,

    allowNull: false,

  },

  total_amount: {

    type: DataTypes.DECIMAL(36, 18),

    allowNull: false,

    defaultValue: 0,

  },

  token_type: {
    type: DataTypes.ENUM('static', 'dynamic'),
    allowNull: false,
    defaultValue: 'static',
    comment: 'Token type: static (default) or dynamic (fee-on-transfer, rebase, tax tokens)',
  },
  tag: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Vault category tag (e.g., Seed, Private, Advisors, Team)',
  },
  org_id: {

    type: DataTypes.UUID,

    allowNull: true,

    references: {

      model: 'organizations',

      key: 'id'

    }

  },

  delegate_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Authorized delegate for this vault',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
  },
  is_blacklisted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Whether this vault has been blacklisted due to integrity failure',
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

  tableName: 'vaults',

  timestamps: true,

  createdAt: 'created_at',

  updatedAt: 'updated_at',

  indexes: [

    {

      fields: ['address'],

      unique: true,

    },

    {

      fields: ['owner_address'],

    },

    {

      fields: ['org_id'],

    }

  ],

});



// Add association method

Vault.associate = function (models) {

  Vault.belongsTo(models.Organization, {

    foreignKey: 'org_id',

    as: 'organization'

  });

  Vault.hasMany(models.Beneficiary, {
    foreignKey: 'vault_id',
    as: 'beneficiaries'
  });
  Vault.hasMany(models.SubSchedule, {
    foreignKey: 'vault_id',
    as: 'subSchedules'
  });
  Vault.hasMany(models.VaultLegalDocument, {
    foreignKey: 'vault_id',
    as: 'legalDocuments'
  });
};



module.exports = Vault;

module.exports.TokenType = TokenType;
