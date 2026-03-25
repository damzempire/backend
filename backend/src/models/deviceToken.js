const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const DeviceToken = sequelize.define('DeviceToken', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Wallet address of the user',
  },
  device_token: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'FCM device token for push notifications',
  },
  platform: {
    type: DataTypes.ENUM('ios', 'android', 'web'),
    allowNull: false,
    comment: 'Device platform',
  },
  app_version: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'App version when token was registered',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether the token is still valid',
  },
  last_used_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'Last time this token was used successfully',
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
  tableName: 'device_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_address'],
    },
    {
      fields: ['device_token'],
      unique: true,
    },
    {
      fields: ['is_active'],
    },
  ],
});

module.exports = DeviceToken;