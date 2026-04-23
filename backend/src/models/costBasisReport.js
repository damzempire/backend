const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const CostBasisReport = sequelize.define('CostBasisReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Beneficiary wallet address',
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token contract address',
  },
  report_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Tax year for this report',
  },
  total_vested_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total amount vested during the year',
  },
  total_cost_basis_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total cost basis in USD for tax purposes',
  },
  total_milestones: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of vesting milestones in the year',
  },
  report_data: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Detailed breakdown of vesting milestones and calculations',
  },
  generated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When this report was generated',
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
  tableName: 'cost_basis_reports',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_address'],
    },
    {
      fields: ['token_address'],
    },
    {
      fields: ['report_year'],
    },
    {
      fields: ['user_address', 'token_address'],
    },
    {
      fields: ['user_address', 'token_address', 'report_year'],
      unique: true,
    },
  ],
});

CostBasisReport.associate = function (models) {
  CostBasisReport.belongsTo(models.Token, {
    foreignKey: 'token_address',
    sourceKey: 'address',
    as: 'token'
  });
};

module.exports = CostBasisReport;