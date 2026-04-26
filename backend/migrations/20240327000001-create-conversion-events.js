'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create conversion_events table
    await queryInterface.createTable('conversion_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      transaction_hash: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Stellar transaction hash for the path payment',
      },
      user_address: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Beneficiary wallet address who performed the conversion',
      },
      claim_id: {
        type: Sequelize.UUID,
        allowNull: true,
        comment: 'Associated claim history ID if this is a claim-and-swap',
      },
      source_asset_code: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Source asset code (e.g., "TOKEN", "XLM")',
      },
      source_asset_issuer: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Source asset issuer address (null for XLM)',
      },
      source_amount: {
        type: Sequelize.DECIMAL(36, 18),
        allowNull: false,
        comment: 'Amount of source asset sent',
      },
      destination_asset_code: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Destination asset code (e.g., "USDC", "XLM")',
      },
      destination_asset_issuer: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Destination asset issuer address (null for XLM)',
      },
      destination_amount: {
        type: Sequelize.DECIMAL(36, 18),
        allowNull: false,
        comment: 'Amount of destination asset received',
      },
      exchange_rate: {
        type: Sequelize.DECIMAL(36, 18),
        allowNull: false,
        comment: 'Exchange rate (destination_amount / source_amount)',
      },
      exchange_rate_usd: {
        type: Sequelize.DECIMAL(36, 18),
        allowNull: true,
        comment: 'Exchange rate in USD terms (for non-USD pairs)',
      },
      path_assets: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of intermediate assets in the path payment',
      },
      slippage_percentage: {
        type: Sequelize.DECIMAL(10, 6),
        allowNull: true,
        comment: 'Slippage percentage from quoted price',
      },
      gas_fee_xlm: {
        type: Sequelize.DECIMAL(36, 18),
        allowNull: false,
        defaultValue: '0',
        comment: 'Gas fee paid in XLM for this transaction',
      },
      block_number: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Stellar ledger sequence number',
      },
      transaction_timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Timestamp when the transaction was included in the ledger',
      },
      conversion_type: {
        type: Sequelize.ENUM('claim_and_swap', 'direct_swap', 'arbitrage'),
        allowNull: false,
        defaultValue: 'direct_swap',
        comment: 'Type of conversion event',
      },
      price_source: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'stellar_dex',
        comment: 'Source of the price data (stellar_dex, oracle, etc.)',
      },
      data_quality: {
        type: Sequelize.ENUM('excellent', 'good', 'fair', 'poor'),
        allowNull: false,
        defaultValue: 'good',
        comment: 'Quality of the price data based on liquidity and depth',
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for conversion_events table
    await queryInterface.addIndex('conversion_events', ['transaction_hash'], { unique: true });
    await queryInterface.addIndex('conversion_events', ['user_address']);
    await queryInterface.addIndex('conversion_events', ['claim_id']);
    await queryInterface.addIndex('conversion_events', ['source_asset_code', 'source_asset_issuer']);
    await queryInterface.addIndex('conversion_events', ['destination_asset_code', 'destination_asset_issuer']);
    await queryInterface.addIndex('conversion_events', ['transaction_timestamp']);
    await queryInterface.addIndex('conversion_events', ['conversion_type']);
    await queryInterface.addIndex('conversion_events', ['block_number']);

    // Add conversion_event_id to claims_history table
    await queryInterface.addColumn('claims_history', 'conversion_event_id', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Associated conversion event ID if claim was followed by immediate swap',
    });

    // Add foreign key constraint for claims_history -> conversion_events
    await queryInterface.addConstraint('claims_history', {
      fields: ['conversion_event_id'],
      type: 'foreign key',
      name: 'claims_history_conversion_event_id_fkey',
      references: {
        table: 'conversion_events',
        field: 'id',
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove foreign key constraint first
    await queryInterface.removeConstraint('claims_history', 'claims_history_conversion_event_id_fkey');

    // Remove conversion_event_id from claims_history
    await queryInterface.removeColumn('claims_history', 'conversion_event_id');

    // Drop conversion_events table
    await queryInterface.dropTable('conversion_events');
  }
};
