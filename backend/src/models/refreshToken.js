const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Hashed refresh token',
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'User wallet address',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Token expiration time',
  },
  is_revoked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether the token has been revoked',
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
  tableName: 'refresh_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['token'],
      unique: true,
    },
    {
      fields: ['user_address'],
    },
    {
      fields: ['expires_at'],
    },
    {
      fields: ['is_revoked'],
    },
  ],
});

module.exports = RefreshToken;
