const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AnnualVestingStatement = sequelize.define('AnnualVestingStatement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userAddress: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'user_address'
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    statementData: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'statement_data'
    },
    pdfFilePath: {
      type: DataTypes.STRING,
      field: 'pdf_file_path'
    },
    digitalSignature: {
      type: DataTypes.TEXT,
      field: 'digital_signature'
    },
    transparencyKeyPublicAddress: {
      type: DataTypes.STRING,
      field: 'transparency_key_public_address'
    },
    generatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'generated_at'
    },
    accessedAt: {
      type: DataTypes.DATE,
      field: 'accessed_at'
    },
    isArchived: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_archived'
    },
    totalVestedAmount: {
      type: DataTypes.DECIMAL(36, 18),
      defaultValue: 0,
      field: 'total_vested_amount'
    },
    totalClaimedAmount: {
      type: DataTypes.DECIMAL(36, 18),
      defaultValue: 0,
      field: 'total_claimed_amount'
    },
    totalUnclaimedAmount: {
      type: DataTypes.DECIMAL(36, 18),
      defaultValue: 0,
      field: 'total_unclaimed_amount'
    },
    totalFMVUSD: {
      type: DataTypes.DECIMAL(36, 18),
      defaultValue: 0,
      field: 'total_fmv_usd'
    },
    totalRealizedGainsUSD: {
      type: DataTypes.DECIMAL(36, 18),
      defaultValue: 0,
      field: 'total_realized_gains_usd'
    },
    numberOfVaults: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'number_of_vaults'
    },
    numberOfClaims: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'number_of_claims'
    }
  }, {
    tableName: 'annual_vesting_statements',
    timestamps: false
  });

  return AnnualVestingStatement;
};