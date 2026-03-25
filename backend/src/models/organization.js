const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  logo_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  website_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  discord_url: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  admin_address: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
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
  tableName: 'organizations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['admin_address'],
      unique: true,
    },
  ],
});

// Add association method
Organization.associate = function(models) {
  Organization.hasMany(models.Vault, {
    foreignKey: 'org_id',
    as: 'vaults'
  });
};

module.exports = Organization;