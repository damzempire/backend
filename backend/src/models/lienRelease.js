const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LienRelease = sequelize.define('LienRelease', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    lien_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'future_liens',
        key: 'id',
      },
      onDelete: 'CASCADE',
      comment: 'ID of the lien being released',
    },
    amount: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      comment: 'Amount released in this transaction',
    },
    release_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When the release occurred',
    },
    vested_at_release: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      comment: 'Total vested amount at release time',
    },
    previously_released: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      comment: 'Amount released before this event',
    },
    available_for_release: {
      type: DataTypes.DECIMAL(20, 8),
      allowNull: false,
      comment: 'Calculated available amount for release',
    },
    transaction_hash: {
      type: DataTypes.STRING(66),
      comment: 'Transaction hash of the release',
    },
    block_number: {
      type: DataTypes.INTEGER,
      comment: 'Block number of the release transaction',
    },
    gas_used: {
      type: DataTypes.BIGINT,
      comment: 'Gas used for the release transaction',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional release metadata',
    },
  }, {
    tableName: 'lien_releases',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // No updates needed for releases
    indexes: [
      { fields: ['lien_id'] },
      { fields: ['release_date'] },
      { fields: ['transaction_hash'] },
    ],
  });

  return LienRelease;
};
