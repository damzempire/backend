const { sequelize } = require('../database/connection');
const { DataTypes } = require('sequelize');
const crypto = require('crypto');

// Define the ApiKey model
const ApiKey = sequelize.define('ApiKey', {
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    hashed_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'api_keys'
  });

// Function to store a new API key
const storeApiKey = async (name, apiKey) => {
  const hashedApiKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');

  await ApiKey.create({
    name,
    hashed_key: hashedApiKey
  });
};

module.exports = { storeApiKey, ApiKey };