const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const CertifiedBuild = sequelize.define('CertifiedBuild', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  build_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Unique identifier for the certified build',
  },
  wasm_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'WASM hash of the certified build',
  },
  version: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Version of the build',
  },
  commit_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Git commit hash of the build',
  },
  build_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Timestamp when the build was created',
  },
  builder_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Address that created and certified the build',
  },
  build_metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional metadata about the build',
  },
  verification_signature: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Signature certifying the build authenticity',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this build is active for upgrades',
  },
  security_audit_passed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether security audit was passed',
  },
  audit_report_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to the security audit report',
  },
  compatibility_version: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Compatibility version for upgrade validation',
  },
  immutable_terms_compatible: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether build preserves immutable terms',
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
  tableName: 'certified_builds',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['wasm_hash'],
      unique: true,
    },
    {
      fields: ['build_id'],
      unique: true,
    },
    {
      fields: ['version'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['security_audit_passed'],
    },
    {
      fields: ['compatibility_version'],
    },
  ],
});

// Add association method
CertifiedBuild.associate = function (models) {
  CertifiedBuild.hasMany(models.ContractUpgradeProposal, {
    foreignKey: 'certified_build_id',
    sourceKey: 'build_id',
    as: 'upgradeProposals'
  });
};

module.exports = CertifiedBuild;
