/**
 * TaxOracleService - Service for integrating with external tax calculation APIs
 * 
 * This service provides integration with third-party tax calculation services
 * to get accurate tax rates, rules, and calculations for different jurisdictions.
 * Supports multiple providers with fallback to internal calculations.
 */

const axios = require('axios');
const Sentry = require('@sentry/node');

class TaxOracleService {
  constructor() {
    this.providers = {
      taxbit: {
        name: 'TaxBit',
        baseUrl: process.env.TAXBIT_API_URL || 'https://api.taxbit.com',
        apiKey: process.env.TAXBIT_API_KEY,
        enabled: process.env.TAXBIT_ENABLED === 'true'
      },
      cointracker: {
        name: 'CoinTracker',
        baseUrl: process.env.COINTRACKER_API_URL || 'https://api.cointracker.io',
        apiKey: process.env.COINTRACKER_API_KEY,
        enabled: process.env.COINTRACKER_ENABLED === 'true'
      },
      koinly: {
        name: 'Koinly',
        baseUrl: process.env.KOINLY_API_URL || 'https://api.koinly.io',
        apiKey: process.env.KOINLY_API_KEY,
        enabled: process.env.KOINLY_ENABLED === 'true'
      }
    };
  }

  /**
   * Get tax rates and rules for a specific jurisdiction
   * @param {string} jurisdiction - Jurisdiction code (e.g., 'US', 'UK', 'DE')
   * @param {Object} options - Additional options for tax calculation
   * @returns {Promise<Object>} Tax rates and rules
   */
  async getTaxRates(jurisdiction, options = {}) {
    const { incomeLevel, filingStatus, taxYear } = options;
    
    // Try external providers first, fallback to internal
    for (const [providerKey, provider] of Object.entries(this.providers)) {
      if (provider.enabled && provider.apiKey) {
        try {
          const result = await this.getTaxRatesFromProvider(providerKey, jurisdiction, options);
          if (result) {
            console.log(`Tax rates retrieved from ${provider.name} for ${jurisdiction}`);
            return {
              provider: providerKey,
              data: result,
              timestamp: new Date()
            };
          }
        } catch (error) {
          console.warn(`Failed to get tax rates from ${provider.name}:`, error.message);
          Sentry.captureException(error, {
            tags: { operation: 'getTaxRates', provider: providerKey },
            extra: { jurisdiction, options }
          });
        }
      }
    }

    // Fallback to internal tax jurisdiction data
    return this.getInternalTaxRates(jurisdiction, options);
  }

  /**
   * Calculate tax liability for a specific tax event
   * @param {Object} taxEvent - Tax event details
   * @returns {Promise<Object>} Tax calculation result
   */
  async calculateTaxLiability(taxEvent) {
    const {
      jurisdiction,
      eventType,
      eventDate,
      tokenPrice,
      vestedAmount,
      claimedAmount,
      costBasis,
      holdingPeriodDays,
      incomeLevel,
      filingStatus
    } = taxEvent;

    // Try external providers first
    for (const [providerKey, provider] of Object.entries(this.providers)) {
      if (provider.enabled && provider.apiKey) {
        try {
          const result = await this.calculateTaxFromProvider(providerKey, taxEvent);
          if (result) {
            console.log(`Tax calculation completed by ${provider.name} for ${jurisdiction}`);
            return {
              provider: providerKey,
              data: result,
              timestamp: new Date()
            };
          }
        } catch (error) {
          console.warn(`Failed to calculate tax with ${provider.name}:`, error.message);
          Sentry.captureException(error, {
            tags: { operation: 'calculateTaxLiability', provider: providerKey },
            extra: { taxEvent }
          });
        }
      }
    }

    // Fallback to internal calculation
    return this.calculateTaxInternally(taxEvent);
  }

  /**
   * Get withholding requirements for a jurisdiction
   * @param {string} jurisdiction - Jurisdiction code
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Withholding requirements
   */
  async getWithholdingRequirements(jurisdiction, options = {}) {
    const { eventType, annualIncome } = options;

    for (const [providerKey, provider] of Object.entries(this.providers)) {
      if (provider.enabled && provider.apiKey) {
        try {
          const result = await this.getWithholdingFromProvider(providerKey, jurisdiction, options);
          if (result) {
            return {
              provider: providerKey,
              data: result,
              timestamp: new Date()
            };
          }
        } catch (error) {
          console.warn(`Failed to get withholding requirements from ${provider.name}:`, error.message);
        }
      }
    }

    return this.getInternalWithholdingRequirements(jurisdiction, options);
  }

  /**
   * Get tax rates from a specific provider
   * @private
   */
  async getTaxRatesFromProvider(providerKey, jurisdiction, options) {
    const provider = this.providers[providerKey];
    
    switch (providerKey) {
      case 'taxbit':
        return this.getTaxBitRates(jurisdiction, options);
      case 'cointracker':
        return this.getCoinTrackerRates(jurisdiction, options);
      case 'koinly':
        return this.getKoinlyRates(jurisdiction, options);
      default:
        throw new Error(`Unknown provider: ${providerKey}`);
    }
  }

  /**
   * Calculate tax using a specific provider
   * @private
   */
  async calculateTaxFromProvider(providerKey, taxEvent) {
    const provider = this.providers[providerKey];
    
    switch (providerKey) {
      case 'taxbit':
        return this.calculateTaxBitTax(taxEvent);
      case 'cointracker':
        return this.calculateCoinTrackerTax(taxEvent);
      case 'koinly':
        return this.calculateKoinlyTax(taxEvent);
      default:
        throw new Error(`Unknown provider: ${providerKey}`);
    }
  }

  /**
   * TaxBit API integration
   * @private
   */
  async getTaxBitRates(jurisdiction, options) {
    const response = await axios.get(`${this.providers.taxbit.baseUrl}/v1/tax-rates`, {
      headers: {
        'Authorization': `Bearer ${this.providers.taxbit.apiKey}`,
        'Content-Type': 'application/json'
      },
      params: {
        jurisdiction,
        year: options.taxYear || new Date().getFullYear(),
        income_level: options.incomeLevel,
        filing_status: options.filingStatus
      }
    });

    return response.data;
  }

  async calculateTaxBitTax(taxEvent) {
    const response = await axios.post(`${this.providers.taxbit.baseUrl}/v1/calculate-tax`, {
      jurisdiction: taxEvent.jurisdiction,
      event_type: taxEvent.eventType,
      event_date: taxEvent.eventDate,
      asset_type: 'cryptocurrency',
      proceeds: parseFloat(taxEvent.tokenPrice) * parseFloat(taxEvent.vestedAmount),
      cost_basis: parseFloat(taxEvent.costBasis),
      holding_period_days: taxEvent.holdingPeriodDays,
      income_level: taxEvent.incomeLevel,
      filing_status: taxEvent.filingStatus
    }, {
      headers: {
        'Authorization': `Bearer ${this.providers.taxbit.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * CoinTracker API integration
   * @private
   */
  async getCoinTrackerRates(jurisdiction, options) {
    const response = await axios.get(`${this.providers.cointracker.baseUrl}/api/v1/tax-rates`, {
      headers: {
        'Authorization': `Bearer ${this.providers.cointracker.apiKey}`,
        'Content-Type': 'application/json'
      },
      params: {
        country: jurisdiction,
        year: options.taxYear || new Date().getFullYear()
      }
    });

    return response.data;
  }

  async calculateCoinTrackerTax(taxEvent) {
    const response = await axios.post(`${this.providers.cointracker.baseUrl}/api/v1/calculate`, {
      country: taxEvent.jurisdiction,
      type: taxEvent.eventType.toLowerCase(),
      date: taxEvent.eventDate,
      amount: parseFloat(taxEvent.vestedAmount),
      price_per_coin: parseFloat(taxEvent.tokenPrice),
      cost_basis: parseFloat(taxEvent.costBasis),
      holding_period: taxEvent.holdingPeriodDays
    }, {
      headers: {
        'Authorization': `Bearer ${this.providers.cointracker.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Koinly API integration
   * @private
   */
  async getKoinlyRates(jurisdiction, options) {
    const response = await axios.get(`${this.providers.koinly.baseUrl}/v1/rates`, {
      headers: {
        'Authorization': `Bearer ${this.providers.koinly.apiKey}`,
        'Content-Type': 'application/json'
      },
      params: {
        country: jurisdiction,
        year: options.taxYear || new Date().getFullYear()
      }
    });

    return response.data;
  }

  async calculateKoinlyTax(taxEvent) {
    const response = await axios.post(`${this.providers.koinly.baseUrl}/v1/tax-calculation`, {
      country_code: taxEvent.jurisdiction,
      transaction_type: taxEvent.eventType,
      date: taxEvent.eventDate,
      crypto_amount: parseFloat(taxEvent.vestedAmount),
      fiat_value: parseFloat(taxEvent.tokenPrice) * parseFloat(taxEvent.vestedAmount),
      cost_basis: parseFloat(taxEvent.costBasis),
      days_held: taxEvent.holdingPeriodDays
    }, {
      headers: {
        'Authorization': `Bearer ${this.providers.koinly.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  /**
   * Internal fallback tax rate calculation
   * @private
   */
  async getInternalTaxRates(jurisdiction, options) {
    const { TaxJurisdiction } = require('../models');
    
    const taxJurisdiction = await TaxJurisdiction.getByCode(jurisdiction);
    if (!taxJurisdiction) {
      throw new Error(`Tax jurisdiction not found: ${jurisdiction}`);
    }

    const taxRate = taxJurisdiction.getTaxRate(options.incomeLevel, options.holdingPeriodDays);

    return {
      jurisdiction,
      tax_rate: taxRate,
      tax_treatment: taxJurisdiction.crypto_tax_treatment,
      vesting_tax_event: taxJurisdiction.vesting_tax_event,
      long_term_holding_period: taxJurisdiction.long_term_holding_period_days,
      filing_deadline: taxJurisdiction.getFilingDeadline(options.taxYear || new Date().getFullYear()),
      estimated_payment_deadlines: taxJurisdiction.getEstimatedPaymentDeadlines(options.taxYear || new Date().getFullYear()),
      provider: 'internal'
    };
  }

  /**
   * Internal fallback tax calculation
   * @private
   */
  async calculateTaxInternally(taxEvent) {
    const { TaxJurisdiction } = require('../models');
    
    const taxJurisdiction = await TaxJurisdiction.getByCode(taxEvent.jurisdiction);
    if (!taxJurisdiction) {
      throw new Error(`Tax jurisdiction not found: ${taxEvent.jurisdiction}`);
    }

    const proceeds = parseFloat(taxEvent.tokenPrice) * parseFloat(taxEvent.vestedAmount);
    const costBasis = parseFloat(taxEvent.costBasis);
    const taxableIncome = proceeds - costBasis;
    const taxRate = taxJurisdiction.getTaxRate(taxableIncome, taxEvent.holdingPeriodDays);
    const taxLiability = taxableIncome * (taxRate / 100);

    return {
      jurisdiction: taxEvent.jurisdiction,
      proceeds,
      cost_basis: costBasis,
      taxable_income: taxableIncome,
      tax_rate_percent: taxRate,
      tax_liability: taxLiability,
      tax_treatment: taxJurisdiction.crypto_tax_treatment,
      holding_period_days: taxEvent.holdingPeriodDays,
      filing_deadline: taxJurisdiction.getFilingDeadline(new Date(taxEvent.eventDate).getFullYear()),
      provider: 'internal'
    };
  }

  /**
   * Internal withholding requirements
   * @private
   */
  async getInternalWithholdingRequirements(jurisdiction, options) {
    const { TaxJurisdiction } = require('../models');
    
    const taxJurisdiction = await TaxJurisdiction.getByCode(jurisdiction);
    if (!taxJurisdiction) {
      throw new Error(`Tax jurisdiction not found: ${jurisdiction}`);
    }

    return {
      jurisdiction,
      withholding_required: taxJurisdiction.tax_withholding_required,
      default_withholding_rate: taxJurisdiction.default_withholding_rate,
      sell_to_cover_allowed: taxJurisdiction.sell_to_cover_allowed,
      provider: 'internal'
    };
  }

  /**
   * Validate tax calculation response
   * @private
   */
  validateTaxResponse(response, provider) {
    const requiredFields = ['tax_liability', 'tax_rate_percent'];
    
    for (const field of requiredFields) {
      if (response[field] === undefined || response[field] === null) {
        throw new Error(`Invalid tax response from ${provider}: missing ${field}`);
      }
    }

    if (typeof response.tax_liability !== 'number' || response.tax_liability < 0) {
      throw new Error(`Invalid tax liability value from ${provider}: ${response.tax_liability}`);
    }

    if (typeof response.tax_rate_percent !== 'number' || response.tax_rate_percent < 0 || response.tax_rate_percent > 100) {
      throw new Error(`Invalid tax rate value from ${provider}: ${response.tax_rate_percent}`);
    }

    return true;
  }

  /**
   * Get provider health status
   */
  async getProviderHealth() {
    const health = {};

    for (const [providerKey, provider] of Object.entries(this.providers)) {
      health[providerKey] = {
        name: provider.name,
        enabled: provider.enabled,
        configured: !!provider.apiKey,
        status: 'unknown'
      };

      if (provider.enabled && provider.apiKey) {
        try {
          // Simple health check - try to get tax rates for US
          await this.getTaxRatesFromProvider(providerKey, 'US', { taxYear: new Date().getFullYear() });
          health[providerKey].status = 'healthy';
        } catch (error) {
          health[providerKey].status = 'unhealthy';
          health[providerKey].error = error.message;
        }
      }
    }

    return health;
  }
}

module.exports = new TaxOracleService();
