const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const SorobanEvent = sequelize.define('SorobanEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  event_type: {
    type: DataTypes.ENUM('VestingScheduleCreated', 'TokensClaimed'),
    allowNull: false,
  },
  contract_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Soroban contract address that emitted the event',
  },
  transaction_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Transaction hash containing the event',
  },
  ledger_sequence: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: 'Ledger sequence number where the event occurred',
  },
  event_body: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'Raw event data from Soroban RPC',
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this event has been processed by business logic',
  },
  processing_error: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if processing failed',
  },
  event_timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Timestamp when the event was emitted (derived from ledger close time)',
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
  tableName: 'soroban_events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['event_type'],
    },
    {
      fields: ['contract_address'],
    },
    {
      fields: ['transaction_hash'],
    },
    {
      fields: ['ledger_sequence'],
    },
    {
      fields: ['processed'],
    },
    {
      fields: ['event_timestamp'],
    },
    {
      fields: ['event_type', 'processed'],
    },
    {
      fields: ['ledger_sequence', 'event_type'],
      unique: true,
      name: 'unique_event_per_ledger_type'
    },
  ],
});

module.exports = SorobanEvent;
