const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const IndexerState = sequelize.define('IndexerState', {
  service_name: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false,
  },
  last_ingested_ledger: {
    type: DataTypes.BIGINT,
    allowNull: false,
    defaultValue: 0,
  },
  last_ingested_hash: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'indexer_state',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
});

module.exports = IndexerState;
