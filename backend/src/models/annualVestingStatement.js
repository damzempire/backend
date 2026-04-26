const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const AnnualVestingStatement = sequelize.define('AnnualVestingStatement', {
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
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Statement year (e.g., 2024)',
  },
  statement_data: {
    type: DataTypes.JSONB,
    allowNull: false,
    comment: 'JSON containing detailed vesting activity, claims, and FMV calculations for the year',
  },
  pdf_file_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path to the generated PDF file in storage',
  },
  digital_signature: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Digital signature of the PDF using backend transparency private key',
  },
  transparency_key_public_address: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Public address of the transparency key used for signing',
  },
  generated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'When the statement was generated',
  },
  accessed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Last time the statement was accessed/downloaded by the user',
  },
  is_archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the statement has been archived for compliance purposes',
  },
  // Summary fields for quick queries
  total_vested_amount: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    comment: 'Total amount vested during the year',
  },
  total_claimed_amount: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    comment: 'Total amount claimed during the year',
  },
  total_unclaimed_amount: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    comment: 'Total unclaimed amount at year end',
  },
  total_fmv_usd: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    comment: 'Total fair market value in USD at year end',
  },
  total_realized_gains_usd: {
    type: DataTypes.DECIMAL(36, 18),
    defaultValue: 0,
    comment: 'Total realized gains/losses in USD for the year',
  },
  number_of_vaults: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of vaults included in the statement',
  },
  number_of_claims: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Number of claims processed during the year',
  },
}, {
  tableName: 'annual_vesting_statements',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_address'],
    },
    {
      fields: ['year'],
    },
    {
      fields: ['generated_at'],
    },
    {
      fields: ['user_address', 'year'],
      unique: true,
    },
  ],
});

// Add association method
AnnualVestingStatement.associate = function (models) {
  AnnualVestingStatement.belongsTo(models.Beneficiary, {
    foreignKey: 'user_address',
    sourceKey: 'address',
    as: 'beneficiary'
  });
};

// Instance methods
AnnualVestingStatement.prototype.markAsAccessed = function() {
  this.accessed_at = new Date();
  return this.save();
};

AnnualVestingStatement.prototype.archive = function() {
  this.is_archived = true;
  return this.save();
};

// Class methods
AnnualVestingStatement.getStatementByUserAndYear = async function(userAddress, year) {
  return await this.findOne({
    where: {
      user_address: userAddress,
      year: year,
    },
  });
};

AnnualVestingStatement.getUserStatements = async function(userAddress, options = {}) {
  const { limit = 10, offset = 0, includeArchived = false } = options;
  
  const whereClause = { user_address: userAddress };
  if (!includeArchived) {
    whereClause.is_archived = false;
  }
  
  return await this.findAndCountAll({
    where: whereClause,
    order: [['year', 'DESC']],
    limit,
    offset,
  });
};

AnnualVestingStatement.getStatementStats = async function(userAddress, year) {
  return await this.findOne({
    where: {
      user_address: userAddress,
      year: year,
    },
    attributes: [
      'total_vested_amount',
      'total_claimed_amount',
      'total_unclaimed_amount',
      'total_fmv_usd',
      'total_realized_gains_usd',
      'number_of_vaults',
      'number_of_claims',
    ],
  });
};

module.exports = AnnualVestingStatement;
