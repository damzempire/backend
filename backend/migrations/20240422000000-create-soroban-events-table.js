'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('soroban_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      event_type: {
        type: Sequelize.ENUM('VestingScheduleCreated', 'TokensClaimed'),
        allowNull: false,
      },
      contract_address: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Soroban contract address that emitted the event',
      },
      transaction_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Transaction hash containing the event',
      },
      ledger_sequence: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Ledger sequence number where the event occurred',
      },
      event_body: {
        type: Sequelize.JSONB,
        allowNull: false,
        comment: 'Raw event data from Soroban RPC',
      },
      processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this event has been processed by business logic',
      },
      processing_error: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if processing failed',
      },
      event_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Timestamp when the event was emitted (derived from ledger close time)',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false,
      },
    });

    // Create indexes
    await queryInterface.addIndex('soroban_events', ['event_type']);
    await queryInterface.addIndex('soroban_events', ['contract_address']);
    await queryInterface.addIndex('soroban_events', ['transaction_hash']);
    await queryInterface.addIndex('soroban_events', ['ledger_sequence']);
    await queryInterface.addIndex('soroban_events', ['processed']);
    await queryInterface.addIndex('soroban_events', ['event_timestamp']);
    await queryInterface.addIndex('soroban_events', ['event_type', 'processed']);
    
    // Add unique constraint for event per ledger and type
    await queryInterface.addIndex('soroban_events', ['ledger_sequence', 'event_type'], {
      unique: true,
      name: 'unique_event_per_ledger_type'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('soroban_events');
  }
};
