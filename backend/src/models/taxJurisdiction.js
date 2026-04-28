const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * TaxJurisdiction - Model for tax jurisdiction configurations
 * 
 * This model stores tax rules, rates, and compliance requirements for
 * different tax jurisdictions around the world, enabling accurate
 * tax calculations based on local regulations.
 */
const TaxJurisdiction = sequelize.define('TaxJurisdiction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  jurisdiction_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'ISO country code or jurisdiction identifier (e.g., US, UK, DE, JP)'
  },
  jurisdiction_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Full name of the tax jurisdiction'
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'USD',
    comment: 'Default currency for tax calculations'
  },
  tax_year_type: {
    type: DataTypes.ENUM('CALENDAR', 'FISCAL', 'CUSTOM'),
    allowNull: false,
    defaultValue: 'CALENDAR',
    comment: 'Type of tax year used in this jurisdiction'
  },
  fiscal_year_start: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Start date of fiscal year (for non-calendar years)'
  },
  fiscal_year_end: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'End date of fiscal year (for non-calendar years)'
  },
  tax_filing_deadline: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Standard tax filing deadline (MM-DD format)'
  },
  estimated_payment_deadlines: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Array of estimated tax payment deadlines (MM-DD format)'
  },
  crypto_tax_treatment: {
    type: DataTypes.ENUM('CAPITAL_GAINS', 'ORDINARY_INCOME', 'HYBRID', 'SPECIAL'),
    allowNull: false,
    defaultValue: 'CAPITAL_GAINS',
    comment: 'How cryptocurrency is treated for tax purposes'
  },
  vesting_tax_event: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether vesting is considered a taxable event'
  },
  short_term_capital_gains_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Short-term capital gains tax rate (%)'
  },
  long_term_capital_gains_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Long-term capital gains tax rate (%)'
  },
  ordinary_income_tax_rates: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Ordinary income tax brackets and rates'
  },
  long_term_holding_period_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 365,
    comment: 'Days required for long-term capital gains treatment'
  },
  tax_withholding_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Whether tax withholding is required'
  },
  default_withholding_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'Default withholding rate (%)'
  },
  sell_to_cover_allowed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether sell-to-cover strategies are permitted'
  },
  tax_reporting_requirements: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Specific tax reporting requirements and forms'
  },
  tax_oracle_config: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Configuration for external tax oracle integration'
  },
  compliance_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional compliance notes and warnings'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this jurisdiction configuration is active'
  },
  effective_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date when this configuration becomes effective'
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
  tableName: 'tax_jurisdictions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['jurisdiction_code'],
      unique: true
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['crypto_tax_treatment'],
    },
  ],
});

// Instance methods
TaxJurisdiction.prototype.isTaxEvent = function(eventType) {
  switch (eventType) {
    case 'VESTING':
      return this.vesting_tax_event;
    case 'CLAIM':
    case 'SELL':
      return true; // Claims and sells are generally taxable events
    default:
      return false;
  }
};

TaxJurisdiction.prototype.getTaxRate = function(incomeAmount, holdingPeriodDays = 0) {
  if (this.crypto_tax_treatment === 'CAPITAL_GAINS') {
    return holdingPeriodDays >= this.long_term_holding_period_days 
      ? this.long_term_capital_gains_rate 
      : this.short_term_capital_gains_rate;
  }
  
  if (this.crypto_tax_treatment === 'ORDINARY_INCOME' && this.ordinary_income_tax_rates) {
    const brackets = this.ordinary_income_tax_rates;
    for (const bracket of brackets.sort((a, b) => b.threshold - a.threshold)) {
      if (incomeAmount >= bracket.threshold) {
        return bracket.rate;
      }
    }
    return brackets[brackets.length - 1]?.rate || 0;
  }
  
  return 0;
};

TaxJurisdiction.prototype.getTaxYearDates = function(year) {
  if (this.tax_year_type === 'CALENDAR') {
    return {
      start: new Date(year, 0, 1), // January 1st
      end: new Date(year, 11, 31)  // December 31st
    };
  }
  
  if (this.tax_year_type === 'FISCAL' && this.fiscal_year_start && this.fiscal_year_end) {
    return {
      start: new Date(this.fiscal_year_start.setFullYear(year)),
      end: new Date(this.fiscal_year_end.setFullYear(year))
    };
  }
  
  // Default to calendar year
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31)
  };
};

TaxJurisdiction.prototype.getFilingDeadline = function(taxYear) {
  if (this.tax_filing_deadline) {
    const [month, day] = this.tax_filing_deadline.split('-');
    return new Date(taxYear + 1, parseInt(month) - 1, parseInt(day));
  }
  
  // Default to April 15th following tax year (US standard)
  return new Date(taxYear + 1, 3, 15);
};

TaxJurisdiction.prototype.getEstimatedPaymentDeadlines = function(taxYear) {
  if (this.estimated_payment_deadlines && this.estimated_payment_deadlines.length > 0) {
    return this.estimated_payment_deadlines.map(deadline => {
      const [month, day] = deadline.split('-');
      return new Date(taxYear, parseInt(month) - 1, parseInt(day));
    });
  }
  
  // Default US quarterly estimated payments
  return [
    new Date(taxYear, 3, 15),  // April 15
    new Date(taxYear, 5, 15),  // June 15
    new Date(taxYear, 8, 15),  // September 15
    new Date(taxYear, 0, 15),  // January 15 (following year)
  ];
};

// Class methods
TaxJurisdiction.getByCode = async function(jurisdictionCode) {
  return await this.findOne({
    where: { 
      jurisdiction_code: jurisdictionCode.toUpperCase(),
      is_active: true 
    }
  });
};

TaxJurisdiction.getAllActive = async function() {
  return await this.findAll({
    where: { is_active: true },
    order: [['jurisdiction_code', 'ASC']]
  });
};

TaxJurisdiction.getDefaultConfigurations = async function() {
  const defaultConfigs = [
    {
      jurisdiction_code: 'US',
      jurisdiction_name: 'United States',
      currency: 'USD',
      tax_year_type: 'CALENDAR',
      tax_filing_deadline: '04-15',
      estimated_payment_deadlines: ['04-15', '06-15', '09-15', '01-15'],
      crypto_tax_treatment: 'CAPITAL_GAINS',
      vesting_tax_event: true,
      short_term_capital_gains_rate: 37.0, // Max ordinary income rate
      long_term_capital_gains_rate: 20.0,
      ordinary_income_tax_rates: [
        { threshold: 0, rate: 10 },
        { threshold: 10275, rate: 12 },
        { threshold: 41775, rate: 22 },
        { threshold: 89450, rate: 24 },
        { threshold: 190750, rate: 32 },
        { threshold: 364200, rate: 35 },
        { threshold: 539900, rate: 37 }
      ],
      long_term_holding_period_days: 365,
      tax_withholding_required: false,
      sell_to_cover_allowed: true
    },
    {
      jurisdiction_code: 'UK',
      jurisdiction_name: 'United Kingdom',
      currency: 'GBP',
      tax_year_type: 'FISCAL',
      fiscal_year_start: '04-06',
      fiscal_year_end: '04-05',
      tax_filing_deadline: '01-31',
      crypto_tax_treatment: 'CAPITAL_GAINS',
      vesting_tax_event: true,
      short_term_capital_gains_rate: 20.0,
      long_term_capital_gains_rate: 10.0,
      ordinary_income_tax_rates: [
        { threshold: 0, rate: 19 },
        { threshold: 12570, rate: 20 },
        { threshold: 50270, rate: 40 },
        { threshold: 125140, rate: 45 }
      ],
      long_term_holding_period_days: 365,
      tax_withholding_required: false,
      sell_to_cover_allowed: true
    },
    {
      jurisdiction_code: 'DE',
      jurisdiction_name: 'Germany',
      currency: 'EUR',
      tax_year_type: 'CALENDAR',
      tax_filing_deadline: '05-31',
      crypto_tax_treatment: 'CAPITAL_GAINS',
      vesting_tax_event: true,
      short_term_capital_gains_rate: 45.0,
      long_term_capital_gains_rate: 26.375, // 25% + solidarity surcharge + church tax
      ordinary_income_tax_rates: [
        { threshold: 0, rate: 0 },
        { threshold: 10908, rate: 14 },
        { threshold: 14854, rate: 24 },
        { threshold: 58796, rate: 42 },
        { threshold: 277826, rate: 45 }
      ],
      long_term_holding_period_days: 365,
      tax_withholding_required: false,
      sell_to_cover_allowed: true
    }
  ];

  for (const config of defaultConfigs) {
    await this.findOrCreate({
      where: { jurisdiction_code: config.jurisdiction_code },
      defaults: config
    });
  }

  return defaultConfigs;
};

module.exports = TaxJurisdiction;
