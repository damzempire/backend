const TaxCalculation = require('../models/taxCalculation');
const TaxOracleService = require('./taxOracleService');
const TaxJurisdiction = require('../models/taxJurisdiction');
const priceService = require('./priceService');
const { Op } = require('sequelize');

/**
 * TaxCalculationService
 * High-precision engine for tax liability and withholding estimates.
 */
class TaxCalculationService {
  /**
   * Wrapper for calculateTaxEvent specifically for vesting.
   */
  async calculateVestingTax(params) {
    const { vaultId, userAddress, jurisdiction, taxYear, tokenPrice, vestedAmount, costBasis = 0, vestingDate } = params;
    
    // Get price from service if not provided
    const currentPrice = tokenPrice || await priceService.getTokenPrice(null); 

    const calculation = await this.calculateTaxEvent({
      userAddress,
      vaultId,
      jurisdictionCode: jurisdiction,
      tokenAmount: vestedAmount,
      currentPriceUsd: currentPrice,
      eventType: 'VESTING',
      taxYear,
      costBasis,
      eventDate: vestingDate
    });

    return {
      summary: {
        taxLiability: parseFloat(calculation.tax_liability_usd),
        taxableIncome: parseFloat(calculation.total_value_usd),
        taxRate: parseFloat(calculation.tax_rate)
      },
      sellToCover: {
        tokensNeeded: parseFloat(calculation.withholding_tokens_estimate)
      },
      taxCalculation: calculation
    };
  }

  /**
   * Wrapper for calculateTaxEvent specifically for claims.
   */
  async calculateClaimTax(params) {
    const { vaultId, userAddress, jurisdiction, taxYear, claimedAmount, tokenPrice, claimDate } = params;
    const currentPrice = tokenPrice || await priceService.getTokenPrice(null);

    const calculation = await this.calculateTaxEvent({
      userAddress,
      vaultId,
      jurisdictionCode: jurisdiction,
      tokenAmount: claimedAmount,
      currentPriceUsd: currentPrice,
      eventType: 'CLAIM',
      taxYear,
      eventDate: claimDate
    });

    return {
      summary: {
        claimedAmount,
        taxLiability: parseFloat(calculation.tax_liability_usd)
      },
      taxCalculation: calculation
    };
  }

  /**
   * Processes actual withholding logic before a claim execution.
   */
  async processTaxWithholding(vaultId, userAddress, amount) {
    const profile = await this.getUserTaxProfile(userAddress);
    const jurisdiction = profile.primaryJurisdiction;

    if (!jurisdiction) {
      return { 
        withholdingRequired: false, 
        withholdingAmount: 0, 
        remainingClaimAmount: parseFloat(amount), 
        reason: 'No tax jurisdiction configured' 
      };
    }

    const requirements = await TaxOracleService.getWithholdingRequirements(jurisdiction);
    const estimate = await this.getWithholdingEstimate(userAddress, { jurisdiction });
    
    const tokenPrice = await priceService.getTokenPrice(null);
    const withholdingUsd = estimate.recommendedWithholding;
    const tokensToWithhold = tokenPrice > 0 ? (withholdingUsd / tokenPrice) : 0;

    return {
      withholdingRequired: requirements.data.withholding_required,
      withholdingAmount: withholdingUsd,
      remainingClaimAmount: Math.max(0, parseFloat(amount) - tokensToWithhold),
      jurisdiction
    };
  }

  /**
   * Logic for Sell-to-Cover tokens needed.
   */
  calculateSellToCover(taxLiabilityUsd, tokenPriceUsd, bufferPercent = 5) {
    if (!tokenPriceUsd || tokenPriceUsd <= 0) return 0;
    const multiplier = 1 + (bufferPercent / 100);
    return (parseFloat(taxLiabilityUsd) * multiplier) / parseFloat(tokenPriceUsd);
  }

  /**
   * Retrieves user tax profile and preferences.
   */
  async getUserTaxProfile(userAddress) {
    const calculations = await TaxCalculation.findAll({
      where: { user_address: userAddress }
    });

    const jurisdictions = [...new Set(calculations.map(c => c.jurisdiction_code))];
    const totalLiabilities = calculations.reduce((sum, c) => sum + parseFloat(c.tax_liability_usd), 0);
  async calculateClaimTax(params) {
    const taxableValueUsd = new BigNumber(params.claimedAmount).times(params.tokenPrice);
    const oracleData = await taxOracleService.getEffectiveTaxRate(params.jurisdiction, taxableValueUsd.toNumber());
    const estimatedTaxUsd = taxableValueUsd.times(oracleData.rate).dividedBy(100);

    const calculation = await TaxCalculation.create({
      user_address: params.userAddress,
      vault_id: params.vaultId,
      jurisdiction_code: params.jurisdiction,
      tax_year: params.taxYear,
      event_type: 'CLAIM',
      token_amount: params.claimedAmount,
      token_price_usd: params.tokenPrice,
      taxable_value_usd: taxableValueUsd.toString(),
      tax_rate: oracleData.rate,
      estimated_tax_usd: estimatedTaxUsd.toString()
    });

    return {
      summary: { claimedAmount: params.claimedAmount, taxLiability: parseFloat(estimatedTaxUsd) },
      taxCalculation: calculation
    };
  }

  async getWithholdingEstimate(userAddress, { jurisdiction, taxYear }) {
    const calculations = await TaxCalculation.findAll({
      where: { user_address: userAddress, tax_year: taxYear }
    });

    const totalTaxLiability = calculations.reduce((sum, c) => sum.plus(c.estimated_tax_usd), new BigNumber(0));
    
    return {
      totalTaxLiability: totalTaxLiability.toNumber(),
      totalWithheld: 0,
      recommendedWithholding: 0,
      calculations
    };
  }

  async getUserTaxProfile(userAddress) {
    const events = await TaxCalculation.findAll({ where: { user_address: userAddress } });
    const jurisdictions = [...new Set(events.map(e => e.jurisdiction_code))];
    const totalTaxLiabilities = events.reduce((sum, e) => sum.plus(e.estimated_tax_usd), new BigNumber(0));

    return {
      userAddress,
      jurisdictions,
      primaryJurisdiction: jurisdictions[0] || null,
      totalTaxLiabilities: totalLiabilities,
      taxEvents: calculations,
      preferences: {
        confirmations: calculations.filter(c => c.user_confirmed === true)
      }
    };
  }

  /**
   * Gets a yearly summary for tax filing.
   */
  async getYearlyTaxSummary(userAddress, taxYear) {
    const events = await TaxCalculation.findAll({
      where: { user_address: userAddress, tax_year: taxYear }
    });

    return {
      taxYear,
      totalTaxableIncome: events.reduce((sum, e) => sum + parseFloat(e.total_value_usd), 0),
      totalTaxLiability: events.reduce((sum, e) => sum + parseFloat(e.tax_liability_usd), 0),
      jurisdictions: [...new Set(events.map(e => e.jurisdiction_code))],
      events
    };
  }

  /**
   * Updates a specific tax calculation (e.g., user confirmation).
   */
  async updateTaxCalculation(id, updates) {
    const calculation = await TaxCalculation.findByPk(id);
    if (!calculation) throw new Error('Tax calculation not found');
    
    const mappedUpdates = { ...updates };
    if (updates.userConfirmed !== undefined) {
      mappedUpdates.user_confirmed = !!updates.userConfirmed;
      delete mappedUpdates.userConfirmed;
    }

    return await calculation.update(mappedUpdates);
  }

  /**
   * Calculates tax liability for a vesting or claim event.
   */
  async calculateTaxEvent(params) {
    const { 
      userAddress, 
      vaultId, 
      jurisdictionCode, 
      tokenAmount, 
      currentPriceUsd, 
      eventType, 
      taxYear,
      costBasis = 0,
      eventDate
    } = params;

    if (!jurisdictionCode || !tokenAmount || !currentPriceUsd) {
      throw new Error("Missing required parameters for tax calculation");
    }

    const jurisdiction = await TaxJurisdiction.getByCode(jurisdictionCode.toUpperCase());
    if (!jurisdiction) throw new Error(`Invalid jurisdiction: ${jurisdictionCode}`);

    // Check if this event type is taxable in this region
    if (!jurisdiction.isTaxEvent(eventType)) {
      return {
        tax_year: taxYear || new Date().getFullYear(),
        tax_event_date: eventDate || new Date(),
        event_type: eventType,
        token_amount: tokenAmount,
        token_price_usd: currentPriceUsd,
        total_value_usd: 0,
        tax_rate: 0,
        tax_liability_usd: 0,
        withholding_tokens_estimate: 0,
        tax_event_type: eventType,
        status: 'SKIPPED'
      };
    }

    const fmv = parseFloat(tokenAmount) * parseFloat(currentPriceUsd);
    // Calculate taxable base (handling cost basis if applicable)
    const taxableAmountUsd = Math.max(0, (parseFloat(currentPriceUsd) - parseFloat(costBasis)) * parseFloat(tokenAmount));
    
    const taxRates = await TaxOracleService.getTaxRates(jurisdictionCode, taxableAmountUsd, eventType);
    const liabilityData = await TaxOracleService.calculateTaxLiability(jurisdictionCode, taxableAmountUsd, eventType);

    const rate = taxRates.data.tax_rate;
    const taxLiabilityUsd = liabilityData.data.tax_liability;
    const source = taxRates.provider;
    
    const buffer = 1.05; // 5% buffer
    const withholdingTokens = (parseFloat(taxLiabilityUsd) * buffer) / parseFloat(currentPriceUsd);

    const calculation = await TaxCalculation.create({
      user_address: userAddress,
      vault_id: vaultId,
      jurisdiction_code: jurisdictionCode,
      tax_year: taxYear || new Date().getFullYear(),
      tax_event_date: eventDate || new Date(),
      tax_event_type: eventType,
      token_amount: tokenAmount,
      token_price_usd: currentPriceUsd,
      total_value_usd: fmv,
      tax_rate: rate,
      tax_liability_usd: taxLiabilityUsd,
      withholding_tokens_estimate: withholdingTokens,
      oracle_source: source,
      status: 'COMPLETED'
    });

    return calculation;
  }

  /**
   * Retrieves estimates for the user dashboard.
   */
  async getWithholdingEstimate(userAddress, options = {}) {
    const where = { user_address: userAddress };
    if (options.taxYear) where.tax_year = options.taxYear;

    const calculations = await TaxCalculation.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    const totalLiability = calculations.reduce((sum, c) => sum + parseFloat(c.tax_liability_usd), 0);
    
    const profile = await this.getUserTaxProfile(userAddress);
    const jurisdiction = options.jurisdiction || profile.primaryJurisdiction;
    
    let recommendedWithholding = 0;
    if (jurisdiction) {
      const requirements = await TaxOracleService.getWithholdingRequirements(jurisdiction);
      if (requirements.data.withholding_required) {
        recommendedWithholding = totalLiability * 1.10; // 10% buffer
      }
    }

    return {
      totalTaxLiability: totalLiability,
      totalWithheld: 0, // Logic for actual withholding tracking would go here
      recommendedWithholding,
      calculations
    };
  }

  /**
   * Admin statistics logic.
   */
  async getTaxStatistics() {
    const [stats, totalLiability] = await Promise.all([
      TaxCalculation.findAll({
        attributes: [
          ['jurisdiction_code', 'jurisdiction'],
          [TaxCalculation.sequelize.fn('COUNT', TaxCalculation.sequelize.col('id')), 'count'],
          [TaxCalculation.sequelize.fn('SUM', TaxCalculation.sequelize.col('tax_liability_usd')), 'total_liability']
        ],
        group: ['jurisdiction_code']
      }),
      TaxCalculation.sum('tax_liability_usd')
    ]);

    return {
      totalCalculations: await TaxCalculation.count(),
      totalTaxLiability: parseFloat(totalLiability || 0),
      jurisdictionBreakdown: stats.map(s => s.get({ plain: true }))
    };
      totalTaxLiabilities: totalTaxLiabilities.toNumber(),
      taxEvents: events,
      preferences: { confirmations: events.filter(e => e.status === 'PROCESSED') }
    };
  }

  async getYearlyTaxSummary(userAddress, taxYear) {
    const events = await this.getUserTaxSummary(userAddress, taxYear);
    return {
      taxYear,
      totalTaxableIncome: events.reduce((sum, e) => sum.plus(e.taxable_value_usd), new BigNumber(0)).toNumber(),
      totalTaxLiability: events.reduce((sum, e) => sum.plus(e.estimated_tax_usd), new BigNumber(0)).toNumber(),
      jurisdictions: [...new Set(events.map(e => e.jurisdiction_code))],
      events
    };
  }

  async updateTaxCalculation(id, updates) {
    const calc = await TaxCalculation.findByPk(id);
    if (!calc) throw new Error('Tax calculation not found');
    
    if (updates.userConfirmed) calc.status = 'PROCESSED';
    return await calc.update(updates);
  }

  async getTaxStatistics() {
    const totalCalculations = await TaxCalculation.count();
    const all = await TaxCalculation.findAll();
    const totalTaxLiability = all.reduce((sum, e) => sum.plus(e.estimated_tax_usd), new BigNumber(0)).toNumber();
    
    return { totalCalculations, totalTaxLiability, jurisdictionBreakdown: [] };
  }

  /**
   * Sell-to-Cover Logic: (taxLiability * 1.05) / currentTokenPrice
   */
  calculateSellToCover(taxLiabilityUsd, currentTokenPrice, customBuffer = 5) {
    if (new BigNumber(currentTokenPrice).isZero()) return new BigNumber(0);
    const buffer = new BigNumber(1).plus(new BigNumber(customBuffer).div(100));
    return new BigNumber(taxLiabilityUsd).times(buffer).dividedBy(currentTokenPrice);
  }
}

module.exports = new TaxCalculationService();