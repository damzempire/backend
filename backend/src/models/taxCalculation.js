const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * TaxCalculation - Model for tracking tax calculations and withholding estimates
 * 
 * This model tracks tax events, calculations, and withholding estimates for
 * beneficiaries across different jurisdictions, supporting real-time tax
 * liability calculations and sell-to-cover recommendations.
 */
const TaxCalculation = sequelize.define('TaxCalculation', {
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
  tax_jurisdiction: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Tax jurisdiction code (e.g., US, UK, DE, JP)'
  },
  tax_year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Tax year for calculation'
  },
  tax_event_type: {
    type: DataTypes.ENUM('VESTING', 'CLAIM', 'SELL', 'YEAR_END'),
    allowNull: false,
    defaultValue: 'VESTING',
    comment: 'Type of tax event triggering calculation'
  },
  tax_event_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Date when tax event occurred'
  },
  token_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Token contract address'
  },
  token_price_usd_at_event: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Token price in USD at tax event time'
  },
  vested_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount of tokens vested at tax event'
  },
  claimed_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount of tokens claimed at tax event'
  },
  cost_basis_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Cost basis in USD for the tokens'
  },
  fair_market_value_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Fair market value in USD at tax event'
  },
  taxable_income_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Taxable income amount in USD'
  },
  tax_rate_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Applicable tax rate percentage'
  },
  estimated_tax_liability_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Estimated tax liability in USD'
  },
  withholding_amount_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Amount withheld for taxes'
  },
  sell_to_cover_tokens: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of tokens to sell to cover tax liability'
  },
  sell_to_cover_usd: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    defaultValue: 0,
    comment: 'USD value of tokens to sell for tax payment'
  },
  remaining_tokens_after_tax: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: 'Remaining tokens after tax payment'
  },
  tax_oracle_provider: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'internal',
    comment: 'Tax oracle provider used for calculation'
  },
  tax_oracle_response: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Raw response from tax oracle'
  },
  calculation_status: {
    type: DataTypes.ENUM('PENDING', 'CALCULATED', 'FAILED', 'WITHHELD'),
    allowNull: false,
    defaultValue: 'PENDING',
    comment: 'Status of tax calculation'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Error message if calculation failed'
  },
  user_confirmed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether user has confirmed the tax calculation'
  },
  auto_withhold_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether automatic withholding is enabled'
  },
  tax_filing_deadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Tax filing deadline for this jurisdiction/year'
  },
  estimated_payment_deadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Estimated tax payment deadline'
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
  tableName: 'tax_calculations',
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
      fields: ['tax_jurisdiction'],
    },
    {
      fields: ['tax_year'],
    },
    {
      fields: ['tax_event_date'],
    },
    {
      fields: ['calculation_status'],
    },
    {
      fields: ['tax_event_type'],
    },
    {
      unique: true,
      fields: ['vault_id', 'user_address', 'tax_year', 'tax_event_type', 'tax_event_date'],
    },
  ],
});

// Add association method
TaxCalculation.associate = function (models) {
  TaxCalculation.belongsTo(models.Vault, {
    foreignKey: 'vault_id',
    as: 'vault'
  });
};

// Instance methods
TaxCalculation.prototype.calculateTaxableIncome = function() {
  return parseFloat(this.fair_market_value_usd) - parseFloat(this.cost_basis_usd);
};

TaxCalculation.prototype.calculateTaxLiability = function(taxRate) {
  const taxableIncome = this.calculateTaxableIncome();
  return taxableIncome * (parseFloat(taxRate) / 100);
};

TaxCalculation.prototype.calculateSellToCover = function(currentTokenPrice) {
  const taxLiability = parseFloat(this.estimated_tax_liability_usd);
  const tokenPrice = parseFloat(currentTokenPrice);
  
  if (tokenPrice === 0) return 0;
  
  // Add 5% buffer for price fluctuations and fees
  const bufferMultiplier = 1.05;
  const tokensNeeded = (taxLiability * bufferMultiplier) / tokenPrice;
  
  return tokensNeeded;
};

TaxCalculation.prototype.isTaxEventDue = function(currentDate = new Date()) {
  return currentDate >= this.tax_event_date;
};

TaxCalculation.prototype.isPaymentOverdue = function(currentDate = new Date()) {
  if (!this.estimated_payment_deadline) return false;
  return currentDate > this.estimated_payment_deadline;
};

// Class methods
TaxCalculation.getTaxCalculationsByUser = async function(userAddress, options = {}) {
  const { year, jurisdiction, status } = options;
  
  const whereClause = { user_address: userAddress };
  
  if (year) whereClause.tax_year = year;
  if (jurisdiction) whereClause.tax_jurisdiction = jurisdiction;
  if (status) whereClause.calculation_status = status;
  
  return await this.findAll({
    where: whereClause,
    order: [['tax_event_date', 'DESC']],
    include: [{
      model: require('.').Vault,
      as: 'vault',
      attributes: ['name', 'token_address', 'owner_address']
    }]
  });
};

TaxCalculation.getTaxCalculationsByVault = async function(vaultId, options = {}) {
  const { year, status } = options;
  
  const whereClause = { vault_id: vaultId };
  
  if (year) whereClause.tax_year = year;
  if (status) whereClause.calculation_status = status;
  
  return await this.findAll({
    where: whereClause,
    order: [['tax_event_date', 'DESC']]
  });
};

TaxCalculation.createTaxCalculation = async function({
  vaultId,
  userAddress,
  taxJurisdiction,
  taxYear,
  taxEventType,
  taxEventDate,
  tokenAddress,
  tokenPriceUsd,
  vestedAmount = '0',
  claimedAmount = '0',
  costBasisUsd = '0',
  fairMarketValueUsd,
  taxRatePercent,
  taxOracleProvider = 'internal',
  taxOracleResponse = null
}) {
  const taxableIncome = parseFloat(fairMarketValueUsd) - parseFloat(costBasisUsd);
  const estimatedTaxLiability = taxableIncome * (parseFloat(taxRatePercent) / 100);
  
  return await this.create({
    vault_id: vaultId,
    user_address: userAddress,
    tax_jurisdiction: taxJurisdiction,
    tax_year: taxYear,
    tax_event_type: taxEventType,
    tax_event_date: taxEventDate,
    token_address: tokenAddress,
    token_price_usd_at_event: tokenPriceUsd,
    vested_amount: vestedAmount,
    claimed_amount: claimedAmount,
    cost_basis_usd: costBasisUsd,
    fair_market_value_usd: fairMarketValueUsd,
    taxable_income_usd: taxableIncome,
    tax_rate_percent: taxRatePercent,
    estimated_tax_liability_usd: estimatedTaxLiability,
    tax_oracle_provider: taxOracleProvider,
    tax_oracle_response: taxOracleResponse,
    calculation_status: 'CALCULATED'
  });
};

TaxCalculation.getYearlyTaxSummary = async function(userAddress, taxYear) {
  const calculations = await this.findAll({
    where: {
      user_address: userAddress,
      tax_year: taxYear,
      calculation_status: 'CALCULATED'
    }
  });

  const summary = {
    taxYear,
    totalTaxableIncome: 0,
    totalTaxLiability: 0,
    totalWithheld: 0,
    totalSellToCoverTokens: 0,
    jurisdictions: new Set(),
    events: []
  };

  calculations.forEach(calc => {
    summary.totalTaxableIncome += parseFloat(calc.taxable_income_usd);
    summary.totalTaxLiability += parseFloat(calc.estimated_tax_liability_usd);
    summary.totalWithheld += parseFloat(calc.withholding_amount_usd);
    summary.totalSellToCoverTokens += parseFloat(calc.sell_to_cover_tokens);
    summary.jurisdictions.add(calc.tax_jurisdiction);
    
    summary.events.push({
      eventType: calc.tax_event_type,
      eventDate: calc.tax_event_date,
      jurisdiction: calc.tax_jurisdiction,
      taxableIncome: calc.taxable_income_usd,
      taxLiability: calc.estimated_tax_liability_usd
    });
  });

  summary.jurisdictions = Array.from(summary.jurisdictions);
  summary.remainingTaxLiability = summary.totalTaxLiability - summary.totalWithheld;

  return summary;
};

module.exports = TaxCalculation;
