const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const GrantStream = sequelize.define('GrantStream', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    address: {
      type: DataTypes.STRING(42),
      allowNull: false,
      unique: true,
      comment: 'Contract address of the grant stream',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Human-readable name of the grant project',
    },
    description: {
      type: DataTypes.TEXT,
      comment: 'Detailed description of the grant project',
    },
    owner_address: {
      type: DataTypes.STRING(42),
      allowNull: false,
      comment: 'Address of the grant project owner',
    },
    token_address: {
      type: DataTypes.STRING(42),
      allowNull: false,
      comment: 'Token address used for funding',
    },
    target_amount: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      comment: 'Target funding amount for the grant',
    },
    current_amount: {
      type: DataTypes.DECIMAL(20, 8),
      defaultValue: 0,
      comment: 'Current amount funded to the grant',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Whether the grant stream is currently active',
    },
    start_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: 'When the grant stream starts accepting funds',
    },
    end_date: {
      type: DataTypes.DATE,
      comment: 'When the grant stream stops accepting funds',
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional project metadata',
    },
  }, {
    tableName: 'grant_streams',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['address'] },
      { fields: ['is_active'] },
      { fields: ['owner_address'] },
    ],
  });

  return GrantStream;
};
