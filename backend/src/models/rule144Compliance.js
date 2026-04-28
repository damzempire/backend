const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * Rule144Compliance - Model for tracking SEC Rule 144 compliance
 * 
 * This model tracks holding periods for restricted securities to ensure
 * compliance with SEC Rule 144, which requires mandatory 6 or 12-month
 * holding periods before restricted securities can be sold.
 */
const Rule144Compliance = sequelize.define('Rule144Compliance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  vault_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'vaults',
      key: 'id'
    },
    comment: 'Associated vault ID'
  },
  user_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Beneficiary wallet address'
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token contract address'
  },
  initial_acquisition_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when tokens were initially acquired'
  },
  holding_period_months: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 6,
    comment: 'Required holding period in months (6 or 12 per Rule 144)'
  },
  holding_period_end_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when holding period expires'
  },
  is_restricted_security: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this is a restricted security under Rule 144'
  },
  exemption_type: {
    type: DataTypes.ENUM('NONE', 'RULE144A', 'RULE144B', 'RULE144C', 'OTHER'),
    allowNull: false,
    defaultValue: 'NONE',
    comment: 'Type of exemption if applicable'
  },
  compliance_status: {
    type: DataTypes.ENUM('PENDING', 'COMPLIANT', 'RESTRICTED'),
    allowNull: false,
    defaultValue: 'PENDING',
    comment: 'Current compliance status'
  },
  last_claim_attempt_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date of last claim attempt'
  },
  total_amount_acquired: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Total amount of tokens initially acquired'
  },
  amount_withdrawn_compliant: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount withdrawn after holding period compliance'
  },
  amount_withdrawn_restricted: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount withdrawn before holding period (should be 0)'
  },
  jurisdiction: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'US',
    comment: 'Jurisdiction for compliance (US, EU, etc.)'
  },
  verified_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Admin address that verified this compliance record'
  },
  verification_date: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Date when compliance was verified'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes about compliance status'
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
  tableName: 'rule144_compliance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['vault_id'],
    },
    {
      fields: ['user_address'],
    },
    {
      fields: ['token_address'],
    },
    {
      fields: ['holding_period_end_date'],
    },
    {
      fields: ['compliance_status'],
    },
    {
      fields: ['is_restricted_security'],
    },
    {
      unique: true,
      fields: ['vault_id', 'user_address'],
    },
  ],
});

// Add association method
Rule144Compliance.associate = function (models) {
  Rule144Compliance.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });
};

// Instance methods
Rule144Compliance.prototype.isHoldingPeriodMet = function(currentDate = new Date()) {
  return currentDate >= this.holding_period_end_date;
};

Rule144Compliance.prototype.getDaysUntilCompliance = function(currentDate = new Date()) {
  if (this.isHoldingPeriodMet(currentDate)) {
    return 0;
  }
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((this.holding_period_end_date - currentDate) / msPerDay);
};

Rule144Compliance.prototype.updateComplianceStatus = function(currentDate = new Date()) {
  if (!this.is_restricted_security) {
    this.compliance_status = 'COMPLIANT';
  } else if (this.isHoldingPeriodMet(currentDate)) {
    this.compliance_status = 'COMPLIANT';
  } else {
    this.compliance_status = 'RESTRICTED';
  }
};

// Class methods
Rule144Compliance.getComplianceByVaultAndUser = async function(vaultId, userAddress) {
  return await this.findOne({
    where: {
      vault_id: vaultId,
      user_address: userAddress
    }
  });
};

Rule144Compliance.createComplianceRecord = async function({
  vaultId,
  userAddress,
  tokenAddress,
  acquisitionDate,
  holdingPeriodMonths = 6,
  totalAmountAcquired = '0',
  isRestrictedSecurity = true,
  jurisdiction = 'US'
}) {
  const holdingPeriodEndDate = new Date(acquisitionDate);
  holdingPeriodEndDate.setMonth(holdingPeriodEndDate.getMonth() + holdingPeriodMonths);

  return await this.create({
    vault_id: vaultId,
    user_address: userAddress,
    token_address: tokenAddress,
    initial_acquisition_date: acquisitionDate,
    holding_period_months: holdingPeriodMonths,
    holding_period_end_date: holdingPeriodEndDate,
    is_restricted_security: isRestrictedSecurity,
    total_amount_acquired: totalAmountAcquired,
    jurisdiction: jurisdiction,
    compliance_status: isRestrictedSecurity ? 'RESTRICTED' : 'COMPLIANT'
  });
};

module.exports = Rule144Compliance;
