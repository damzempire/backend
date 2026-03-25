/**
 * TaxCalculationService - Service for calculating tax liabilities and withholding
 * 
 * This service provides comprehensive tax calculation functionality including
 * real-time tax liability estimation, withholding calculations, and sell-to-cover
 * recommendations for crypto vesting events across multiple jurisdictions.
 */

const { TaxCalculation, TaxJurisdiction, Vault, SubSchedule } = require('../models');
const taxOracleService = require('./taxOracleService');
const priceService = require('./priceService');
const Sentry = require('@sentry/node');

class TaxCalculationService {
  /**
   * Calculate tax liability for a vesting event
   * @param {Object} params - Calculation parameters
   * @returns {Promise<Object>} Tax calculation result
   */
  async calculateVestingTax({
    vaultId,
    userAddress,
    jurisdiction,
    taxYear,
    vestingDate,
    tokenPrice,
    vestedAmount,
    costBasis = '0',
    holdingPeriodDays = 0,
    incomeLevel,
    filingStatus
  }) {
    try {
      console.log(`Calculating vesting tax for user ${userAddress} in ${jurisdiction}`);

      // Get token price if not provided
      const currentTokenPrice = tokenPrice || await this.getCurrentTokenPrice(vaultId);
      
      // Calculate fair market value
      const fmv = parseFloat(currentTokenPrice) * parseFloat(vestedAmount);
      
      // Get tax rates from oracle
      const taxRates = await taxOracleService.getTaxRates(jurisdiction, {
        incomeLevel,
        filingStatus,
        taxYear
      });

      // Calculate tax liability
      const taxEvent = {
        jurisdiction,
        eventType: 'VESTING',
        eventDate: vestingDate,
        tokenPrice: currentTokenPrice,
        vestedAmount,
        claimedAmount: '0',
        costBasis,
        holdingPeriodDays,
        incomeLevel,
        filingStatus
      };

      const taxCalculation = await taxOracleService.calculateTaxLiability(taxEvent);
      
      // Validate and process the result
      taxOracleService.validateTaxResponse(taxCalculation.data, taxCalculation.provider);

      // Calculate sell-to-cover recommendation
      const sellToCoverTokens = this.calculateSellToCover(
        taxCalculation.data.tax_liability,
        currentTokenPrice
      );

      // Create tax calculation record
      const taxRecord = await TaxCalculation.createTaxCalculation({
        vaultId,
        userAddress,
        taxJurisdiction: jurisdiction,
        taxYear,
        taxEventType: 'VESTING',
        taxEventDate: vestingDate,
        tokenAddress: await this.getTokenAddress(vaultId),
        tokenPriceUsd: currentTokenPrice,
        vestedAmount,
        costBasisUsd: costBasis,
        fairMarketValueUsd: fmv,
        taxRatePercent: taxCalculation.data.tax_rate_percent,
        taxOracleProvider: taxCalculation.provider,
        taxOracleResponse: taxCalculation.data
      });

      // Update sell-to-cover calculations
      taxRecord.sell_to_cover_tokens = sellToCoverTokens.toString();
      taxRecord.sell_to_cover_usd = (parseFloat(sellToCoverTokens) * parseFloat(currentTokenPrice)).toString();
      taxRecord.remaining_tokens_after_tax = (parseFloat(vestedAmount) - parseFloat(sellToCoverTokens)).toString();
      await taxRecord.save();

      console.log(`Vesting tax calculation completed for user ${userAddress}: $${taxCalculation.data.tax_liability}`);

      return {
        taxCalculation: taxRecord.toJSON(),
        taxRates: taxRates.data,
        sellToCover: {
          tokensNeeded: sellToCoverTokens,
          usdValue: parseFloat(sellToCoverTokens) * parseFloat(currentTokenPrice),
          remainingTokens: parseFloat(vestedAmount) - parseFloat(sellToCoverTokens)
        },
        summary: {
          vestedAmount,
          fairMarketValue: fmv,
          costBasis,
          taxableIncome: taxCalculation.data.taxable_income || fmv - parseFloat(costBasis),
          taxRate: taxCalculation.data.tax_rate_percent,
          taxLiability: taxCalculation.data.tax_liability,
          filingDeadline: taxCalculation.data.filing_deadline
        }
      };
    } catch (error) {
      console.error('Error calculating vesting tax:', error);
      Sentry.captureException(error, {
        tags: { operation: 'calculateVestingTax' },
        extra: { vaultId, userAddress, jurisdiction }
      });
      throw error;
    }
  }

  /**
   * Calculate tax liability for a claim event
   * @param {Object} params - Calculation parameters
   * @returns {Promise<Object>} Tax calculation result
   */
  async calculateClaimTax({
    vaultId,
    userAddress,
    jurisdiction,
    taxYear,
    claimDate,
    tokenPrice,
    claimedAmount,
    costBasis = '0',
    holdingPeriodDays = 0,
    incomeLevel,
    filingStatus
  }) {
    try {
      console.log(`Calculating claim tax for user ${userAddress} in ${jurisdiction}`);

      const currentTokenPrice = tokenPrice || await this.getCurrentTokenPrice(vaultId);
      const fmv = parseFloat(currentTokenPrice) * parseFloat(claimedAmount);

      // Get tax rates and calculate liability
      const taxRates = await taxOracleService.getTaxRates(jurisdiction, {
        incomeLevel,
        filingStatus,
        taxYear
      });

      const taxEvent = {
        jurisdiction,
        eventType: 'CLAIM',
        eventDate: claimDate,
        tokenPrice: currentTokenPrice,
        vestedAmount: claimedAmount,
        claimedAmount,
        costBasis,
        holdingPeriodDays,
        incomeLevel,
        filingStatus
      };

      const taxCalculation = await taxOracleService.calculateTaxLiability(taxEvent);
      taxOracleService.validateTaxResponse(taxCalculation.data, taxCalculation.provider);

      const sellToCoverTokens = this.calculateSellToCover(
        taxCalculation.data.tax_liability,
        currentTokenPrice
      );

      // Create tax calculation record
      const taxRecord = await TaxCalculation.createTaxCalculation({
        vaultId,
        userAddress,
        taxJurisdiction: jurisdiction,
        taxYear,
        taxEventType: 'CLAIM',
        taxEventDate: claimDate,
        tokenAddress: await this.getTokenAddress(vaultId),
        tokenPriceUsd: currentTokenPrice,
        claimedAmount,
        costBasisUsd: costBasis,
        fairMarketValueUsd: fmv,
        taxRatePercent: taxCalculation.data.tax_rate_percent,
        taxOracleProvider: taxCalculation.provider,
        taxOracleResponse: taxCalculation.data
      });

      taxRecord.sell_to_cover_tokens = sellToCoverTokens.toString();
      taxRecord.sell_to_cover_usd = (parseFloat(sellToCoverTokens) * parseFloat(currentTokenPrice)).toString();
      taxRecord.remaining_tokens_after_tax = (parseFloat(claimedAmount) - parseFloat(sellToCoverTokens)).toString();
      await taxRecord.save();

      return {
        taxCalculation: taxRecord.toJSON(),
        taxRates: taxRates.data,
        sellToCover: {
          tokensNeeded: sellToCoverTokens,
          usdValue: parseFloat(sellToCoverTokens) * parseFloat(currentTokenPrice),
          remainingTokens: parseFloat(claimedAmount) - parseFloat(sellToCoverTokens)
        },
        summary: {
          claimedAmount,
          fairMarketValue: fmv,
          costBasis,
          taxableIncome: taxCalculation.data.taxable_income || fmv - parseFloat(costBasis),
          taxRate: taxCalculation.data.tax_rate_percent,
          taxLiability: taxCalculation.data.tax_liability,
          filingDeadline: taxCalculation.data.filing_deadline
        }
      };
    } catch (error) {
      console.error('Error calculating claim tax:', error);
      Sentry.captureException(error, {
        tags: { operation: 'calculateClaimTax' },
        extra: { vaultId, userAddress, jurisdiction }
      });
      throw error;
    }
  }

  /**
   * Get withholding estimate for a user
   * @param {string} userAddress - User wallet address
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Withholding estimate
   */
  async getWithholdingEstimate(userAddress, options = {}) {
    try {
      const { jurisdiction, taxYear, vaultId } = options;
      
      // Get user's tax calculations
      const calculations = await TaxCalculation.getTaxCalculationsByUser(userAddress, {
        year: taxYear,
        jurisdiction,
        status: 'CALCULATED'
      });

      if (calculations.length === 0) {
        return {
          totalTaxLiability: 0,
          totalWithheld: 0,
          remainingLiability: 0,
          recommendedWithholding: 0,
          calculations: []
        };
      }

      // Calculate totals
      const totalTaxLiability = calculations.reduce((sum, calc) => 
        sum + parseFloat(calc.estimated_tax_liability_usd), 0
      );
      
      const totalWithheld = calculations.reduce((sum, calc) => 
        sum + parseFloat(calc.withholding_amount_usd), 0
      );

      const remainingLiability = totalTaxLiability - totalWithheld;
      
      // Get withholding requirements
      const primaryJurisdiction = calculations[0].tax_jurisdiction;
      const withholdingRequirements = await taxOracleService.getWithholdingRequirements(primaryJurisdiction);

      let recommendedWithholding = 0;
      if (withholdingRequirements.data.withholding_required && remainingLiability > 0) {
        recommendedWithholding = remainingLiability * (1 + 0.10); // 10% buffer
      }

      return {
        totalTaxLiability,
        totalWithheld,
        remainingLiability,
        recommendedWithholding,
        withholdingRequirements: withholdingRequirements.data,
        calculations: calculations.map(calc => ({
          id: calc.id,
          taxEventType: calc.tax_event_type,
          taxEventDate: calc.tax_event_date,
          taxLiability: calc.estimated_tax_liability_usd,
          withholdingAmount: calc.withholding_amount_usd,
          jurisdiction: calc.tax_jurisdiction
        }))
      };
    } catch (error) {
      console.error('Error getting withholding estimate:', error);
      Sentry.captureException(error, {
        tags: { operation: 'getWithholdingEstimate' },
        extra: { userAddress, options }
      });
      throw error;
    }
  }

  /**
   * Calculate sell-to-cover recommendation
   * @param {number} taxLiabilityUSD - Tax liability in USD
   * @param {number} currentTokenPrice - Current token price in USD
   * @param {number} bufferPercent - Buffer percentage for price fluctuations (default 5%)
   * @returns {number} Number of tokens to sell
   */
  calculateSellToCover(taxLiabilityUSD, currentTokenPrice, bufferPercent = 5) {
    if (parseFloat(currentTokenPrice) === 0) return 0;
    
    const bufferMultiplier = 1 + (bufferPercent / 100);
    const tokensNeeded = (parseFloat(taxLiabilityUSD) * bufferMultiplier) / parseFloat(currentTokenPrice);
    
    return Math.ceil(tokensNeeded * 1000000) / 1000000; // Round to 6 decimal places
  }

  /**
   * Get user's tax profile and preferences
   * @param {string} userAddress - User wallet address
   * @returns {Promise<Object>} User tax profile
   */
  async getUserTaxProfile(userAddress) {
    try {
      // Get user's tax calculations to infer jurisdiction
      const recentCalculations = await TaxCalculation.getTaxCalculationsByUser(userAddress, {
        status: 'CALCULATED'
      });

      if (recentCalculations.length === 0) {
        return {
          userAddress,
          jurisdictions: [],
          primaryJurisdiction: null,
          totalTaxLiabilities: 0,
          taxEvents: [],
          preferences: {
            autoWithhold: false,
            sellToCover: false,
            confirmations: []
          }
        };
      }

      // Aggregate tax data
      const jurisdictions = [...new Set(recentCalculations.map(calc => calc.tax_jurisdiction))];
      const primaryJurisdiction = recentCalculations[0].tax_jurisdiction;
      
      const totalTaxLiabilities = recentCalculations.reduce((sum, calc) => 
        sum + parseFloat(calc.estimated_tax_liability_usd), 0
      );

      const taxEvents = recentCalculations.map(calc => ({
        id: calc.id,
        eventType: calc.tax_event_type,
        eventDate: calc.tax_event_date,
        jurisdiction: calc.tax_jurisdiction,
        taxLiability: calc.estimated_tax_liability_usd,
        status: calc.calculation_status,
        userConfirmed: calc.user_confirmed
      }));

      return {
        userAddress,
        jurisdictions,
        primaryJurisdiction,
        totalTaxLiabilities,
        taxEvents,
        preferences: {
          autoWithhold: recentCalculations.some(calc => calc.auto_withhold_enabled),
          sellToCover: recentCalculations.some(calc => calc.sell_to_cover_tokens > 0),
          confirmations: recentCalculations
            .filter(calc => calc.user_confirmed)
            .map(calc => ({ taxCalculationId: calc.id, confirmedAt: calc.updated_at }))
        }
      };
    } catch (error) {
      console.error('Error getting user tax profile:', error);
      Sentry.captureException(error, {
        tags: { operation: 'getUserTaxProfile' },
        extra: { userAddress }
      });
      throw error;
    }
  }

  /**
   * Get yearly tax summary for a user
   * @param {string} userAddress - User wallet address
   * @param {number} taxYear - Tax year
   * @returns {Promise<Object>} Yearly tax summary
   */
  async getYearlyTaxSummary(userAddress, taxYear) {
    try {
      const summary = await TaxCalculation.getYearlyTaxSummary(userAddress, taxYear);
      
      // Add additional metadata
      const jurisdiction = await TaxJurisdiction.getByCode(summary.jurisdictions[0]);
      if (jurisdiction) {
        summary.filingDeadline = jurisdiction.getFilingDeadline(taxYear);
        summary.estimatedPaymentDeadlines = jurisdiction.getEstimatedPaymentDeadlines(taxYear);
      }

      return summary;
    } catch (error) {
      console.error('Error getting yearly tax summary:', error);
      Sentry.captureException(error, {
        tags: { operation: 'getYearlyTaxSummary' },
        extra: { userAddress, taxYear }
      });
      throw error;
    }
  }

  /**
   * Update tax calculation with user confirmation
   * @param {string} taxCalculationId - Tax calculation ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated tax calculation
   */
  async updateTaxCalculation(taxCalculationId, updates) {
    try {
      const taxCalculation = await TaxCalculation.findByPk(taxCalculationId);
      
      if (!taxCalculation) {
        throw new Error(`Tax calculation not found: ${taxCalculationId}`);
      }

      // Apply updates
      Object.assign(taxCalculation, updates);
      await taxCalculation.save();

      console.log(`Tax calculation ${taxCalculationId} updated`);
      return taxCalculation.toJSON();
    } catch (error) {
      console.error('Error updating tax calculation:', error);
      Sentry.captureException(error, {
        tags: { operation: 'updateTaxCalculation' },
        extra: { taxCalculationId, updates }
      });
      throw error;
    }
  }

  /**
   * Process tax withholding for a claim
   * @param {string} vaultId - Vault ID
   * @param {string} userAddress - User address
   * @param {string} claimAmount - Amount being claimed
   * @returns {Promise<Object>} Withholding result
   */
  async processTaxWithholding(vaultId, userAddress, claimAmount) {
    try {
      // Get user's tax profile
      const taxProfile = await this.getUserTaxProfile(userAddress);
      
      if (!taxProfile.primaryJurisdiction) {
        return {
          withholdingRequired: false,
          withholdingAmount: 0,
          reason: 'No tax jurisdiction configured'
        };
      }

      // Get withholding requirements
      const withholdingRequirements = await taxOracleService.getWithholdingRequirements(
        taxProfile.primaryJurisdiction
      );

      if (!withholdingRequirements.data.withholding_required) {
        return {
          withholdingRequired: false,
          withholdingAmount: 0,
          reason: 'Withholding not required for jurisdiction'
        };
      }

      // Calculate withholding amount
      const currentTaxYear = new Date().getFullYear();
      const withholdingEstimate = await this.getWithholdingEstimate(userAddress, {
        taxYear: currentTaxYear,
        jurisdiction: taxProfile.primaryJurisdiction
      });

      const withholdingAmount = Math.min(
        withholdingEstimate.recommendedWithholding,
        parseFloat(claimAmount) * await this.getCurrentTokenPrice(vaultId)
      );

      return {
        withholdingRequired: true,
        withholdingAmount,
        remainingClaimAmount: parseFloat(claimAmount) - (withholdingAmount / await this.getCurrentTokenPrice(vaultId)),
        jurisdiction: taxProfile.primaryJurisdiction,
        withholdingRate: withholdingRequirements.data.default_withholding_rate
      };
    } catch (error) {
      console.error('Error processing tax withholding:', error);
      Sentry.captureException(error, {
        tags: { operation: 'processTaxWithholding' },
        extra: { vaultId, userAddress, claimAmount }
      });
      throw error;
    }
  }

  /**
   * Helper methods
   * @private
   */
  async getCurrentTokenPrice(vaultId) {
    const vault = await Vault.findByPk(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    return await priceService.getTokenPrice(vault.token_address, new Date());
  }

  async getTokenAddress(vaultId) {
    const vault = await Vault.findByPk(vaultId);
    if (!vault) {
      throw new Error(`Vault not found: ${vaultId}`);
    }
    return vault.token_address;
  }

  /**
   * Get tax calculation statistics
   * @param {Object} filters - Filters for statistics
   * @returns {Promise<Object>} Tax calculation statistics
   */
  async getTaxStatistics(filters = {}) {
    try {
      const { jurisdiction, taxYear, vaultId } = filters;
      
      const whereClause = {};
      if (jurisdiction) whereClause.tax_jurisdiction = jurisdiction;
      if (taxYear) whereClause.tax_year = taxYear;
      if (vaultId) whereClause.vault_id = vaultId;

      const totalCalculations = await TaxCalculation.count({ where: whereClause });
      const totalTaxLiability = await TaxCalculation.sum('estimated_tax_liability_usd', { where: whereClause });
      const totalWithheld = await TaxCalculation.sum('withholding_amount_usd', { where: whereClause });

      const statusBreakdown = await TaxCalculation.findAll({
        attributes: [
          'calculation_status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: whereClause,
        group: ['calculation_status'],
        raw: true
      });

      const jurisdictionBreakdown = await TaxCalculation.findAll({
        attributes: [
          'tax_jurisdiction',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
          [require('sequelize').fn('SUM', require('sequelize').col('estimated_tax_liability_usd')), 'total_liability']
        ],
        where: whereClause,
        group: ['tax_jurisdiction'],
        raw: true
      });

      return {
        totalCalculations,
        totalTaxLiability: totalTaxLiability || 0,
        totalWithheld: totalWithheld || 0,
        averageTaxLiability: totalCalculations > 0 ? (totalTaxLiability / totalCalculations) : 0,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item.calculation_status] = parseInt(item.count);
          return acc;
        }, {}),
        jurisdictionBreakdown: jurisdictionBreakdown.map(item => ({
          jurisdiction: item.tax_jurisdiction,
          count: parseInt(item.count),
          totalLiability: parseFloat(item.total_liability)
        }))
      };
    } catch (error) {
      console.error('Error getting tax statistics:', error);
      Sentry.captureException(error, {
        tags: { operation: 'getTaxStatistics' },
        extra: { filters }
      });
      throw error;
    }
  }
}

module.exports = new TaxCalculationService();
