const { sequelize } = require('../database/connection');
const { ConversionEvent, ClaimsHistory, CostBasisReport } = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const moment = require('moment');

/**
 * Service for analyzing path payment data and generating cost basis reports
 * Provides analytics for conversion events and tax reporting
 */
class PathPaymentAnalyticsService {
  constructor() {
    this.serviceName = 'path-payment-analytics';
  }

  /**
   * Get conversion events for a user within a date range
   */
  async getUserConversionEvents(userAddress, startDate, endDate, options = {}) {
    const {
      conversionType = null,
      assetPair = null,
      limit = 100,
      offset = 0,
      orderBy = 'transaction_timestamp',
      orderDirection = 'DESC'
    } = options;

    const whereClause = {
      user_address: userAddress,
      transaction_timestamp: {
        [Op.between]: [startDate, endDate]
      }
    };

    if (conversionType) {
      whereClause.conversion_type = conversionType;
    }

    if (assetPair) {
      const [source, destination] = assetPair.split('/');
      whereClause[Op.and] = [
        { source_asset_code: source },
        { destination_asset_code: destination }
      ];
    }

    const events = await ConversionEvent.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[orderBy, orderDirection.toUpperCase()]],
      include: [
        {
          model: ClaimsHistory,
          as: 'claim',
          required: false,
          attributes: ['id', 'amount_claimed', 'claim_timestamp', 'price_at_claim_usd']
        }
      ]
    });

    return {
      events: events.rows,
      total: events.count,
      hasMore: (offset + events.rows.length) < events.count
    };
  }

  /**
   * Generate cost basis report for a user for a specific tax year
   */
  async generateCostBasisReport(userAddress, taxYear) {
    const startDate = moment(`${taxYear}-01-01`).startOf('year').toDate();
    const endDate = moment(`${taxYear}-12-31`).endOf('year').toDate();

    // Get all conversion events for the year
    const conversionEvents = await ConversionEvent.findAll({
      where: {
        user_address: userAddress,
        transaction_timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      include: [
        {
          model: ClaimsHistory,
          as: 'claim',
          required: false,
          include: [
            {
              association: 'token',
              attributes: ['code', 'issuer', 'decimals']
            }
          ]
        }
      ],
      order: [['transaction_timestamp', 'ASC']]
    });

    // Process events to calculate cost basis
    const reportData = await this.processCostBasisEvents(conversionEvents, taxYear);

    // Create or update cost basis report
    const [report, created] = await CostBasisReport.findOrCreate({
      where: {
        user_address: userAddress,
        token_address: 'MULTI_CURRENCY', // Special identifier for multi-currency reports
        report_year: taxYear
      },
      defaults: {
        total_vested_amount: reportData.totalVestedAmount,
        total_cost_basis_usd: reportData.totalCostBasisUSD,
        total_milestones: reportData.totalEvents,
        report_data: reportData.detailedBreakdown
      }
    });

    if (!created) {
      await report.update({
        total_vested_amount: reportData.totalVestedAmount,
        total_cost_basis_usd: reportData.totalCostBasisUSD,
        total_milestones: reportData.totalEvents,
        report_data: reportData.detailedBreakdown
      });
    }

    return report;
  }

  /**
   * Process conversion events to calculate cost basis
   */
  async processCostBasisEvents(events, taxYear) {
    const detailedBreakdown = [];
    let totalVestedAmount = 0;
    let totalCostBasisUSD = 0;
    let totalEvents = 0;

    for (const event of events) {
      let costBasisUSD = 0;
      let vestedAmount = 0;

      if (event.conversion_type === 'claim_and_swap' && event.claim) {
        // For claim-and-swap, use the claim amount as vested amount
        vestedAmount = parseFloat(event.claim.amount_claimed);
        
        // Calculate cost basis based on USD value at conversion time
        if (event.exchange_rate_usd) {
          costBasisUSD = vestedAmount * parseFloat(event.exchange_rate_usd);
        } else if (event.destination_asset_code === 'USDC') {
          // If converted to USDC, use the destination amount
          costBasisUSD = parseFloat(event.destination_amount);
        } else if (event.claim.price_at_claim_usd) {
          // Fallback to claim price if available
          costBasisUSD = vestedAmount * parseFloat(event.claim.price_at_claim_usd);
        }
      } else if (event.conversion_type === 'direct_swap') {
        // For direct swaps, calculate based on the swap
        vestedAmount = parseFloat(event.source_amount);
        
        if (event.exchange_rate_usd) {
          costBasisUSD = vestedAmount * parseFloat(event.exchange_rate_usd);
        } else if (event.destination_asset_code === 'USDC') {
          costBasisUSD = parseFloat(event.destination_amount);
        }
      }

      totalVestedAmount += vestedAmount;
      totalCostBasisUSD += costBasisUSD;
      totalEvents++;

      detailedBreakdown.push({
        id: event.id,
        transaction_hash: event.transaction_hash,
        timestamp: event.transaction_timestamp,
        conversion_type: event.conversion_type,
        source_asset: {
          code: event.source_asset_code,
          issuer: event.source_asset_issuer,
          amount: event.source_amount
        },
        destination_asset: {
          code: event.destination_asset_code,
          issuer: event.destination_asset_issuer,
          amount: event.destination_amount
        },
        vested_amount: vestedAmount,
        cost_basis_usd: costBasisUSD,
        exchange_rate: event.exchange_rate,
        exchange_rate_usd: event.exchange_rate_usd,
        gas_fee_xlm: event.gas_fee_xlm,
        slippage_percentage: event.slippage_percentage,
        data_quality: event.data_quality,
        claim_id: event.claim_id
      });
    }

    return {
      totalVestedAmount,
      totalCostBasisUSD,
      totalEvents,
      detailedBreakdown,
      taxYear,
      generatedAt: new Date()
    };
  }

  /**
   * Get analytics summary for a user
   */
  async getUserAnalyticsSummary(userAddress, timeRange = '1Y') {
    const endDate = new Date();
    const startDate = this.getStartDateFromRange(timeRange);

    const analytics = await ConversionEvent.findAll({
      where: {
        user_address: userAddress,
        transaction_timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [fn('COUNT', col('id')), 'total_conversions'],
        [fn('SUM', col('source_amount')), 'total_source_amount'],
        [fn('SUM', col('destination_amount')), 'total_destination_amount'],
        [fn('AVG', col('exchange_rate')), 'avg_exchange_rate'],
        [fn('AVG', col('slippage_percentage')), 'avg_slippage'],
        [fn('SUM', col('gas_fee_xlm')), 'total_gas_fees']
      ],
      group: ['conversion_type'],
      raw: true
    });

    // Get asset pair breakdown
    const assetPairs = await ConversionEvent.findAll({
      where: {
        user_address: userAddress,
        transaction_timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'source_asset_code',
        'destination_asset_code',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('source_amount')), 'total_volume'],
        [fn('AVG', col('exchange_rate')), 'avg_rate']
      ],
      group: ['source_asset_code', 'destination_asset_code'],
      order: [[literal('count'), 'DESC']],
      limit: 10
    });

    // Get monthly trends
    const monthlyTrends = await ConversionEvent.findAll({
      where: {
        user_address: userAddress,
        transaction_timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [fn('DATE_TRUNC', 'month', col('transaction_timestamp')), 'month'],
        [fn('COUNT', col('id')), 'conversions'],
        [fn('SUM', col('destination_amount')), 'total_amount']
      ],
      group: [fn('DATE_TRUNC', 'month', col('transaction_timestamp'))],
      order: [[fn('DATE_TRUNC', 'month', col('transaction_timestamp')), 'ASC']]
    });

    return {
      summary: analytics,
      topAssetPairs: assetPairs,
      monthlyTrends: monthlyTrends,
      timeRange,
      period: {
        start: startDate,
        end: endDate
      }
    };
  }

  /**
   * Get exchange rate analytics for specific asset pairs
   */
  async getExchangeRateAnalytics(sourceAsset, destinationAsset, timeRange = '1M') {
    const endDate = new Date();
    const startDate = this.getStartDateFromRange(timeRange);

    const rateData = await ConversionEvent.findAll({
      where: {
        source_asset_code: sourceAsset.code,
        source_asset_issuer: sourceAsset.issuer || null,
        destination_asset_code: destinationAsset.code,
        destination_asset_issuer: destinationAsset.issuer || null,
        transaction_timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'exchange_rate',
        'exchange_rate_usd',
        'transaction_timestamp',
        'source_amount',
        'destination_amount',
        'data_quality'
      ],
      order: [['transaction_timestamp', 'ASC']]
    });

    if (rateData.length === 0) {
      return {
        assetPair: `${sourceAsset.code}/${destinationAsset.code}`,
        timeRange,
        data: [],
        statistics: null
      };
    }

    // Calculate statistics
    const rates = rateData.map(d => parseFloat(d.exchange_rate));
    const volumes = rateData.map(d => parseFloat(d.source_amount));

    const statistics = {
      minRate: Math.min(...rates),
      maxRate: Math.max(...rates),
      avgRate: rates.reduce((a, b) => a + b, 0) / rates.length,
      medianRate: this.calculateMedian(rates),
      totalVolume: volumes.reduce((a, b) => a + b, 0),
      totalTransactions: rates.length,
      volatility: this.calculateVolatility(rates),
      priceTrend: this.calculateTrend(rates)
    };

    return {
      assetPair: `${sourceAsset.code}/${destinationAsset.code}`,
      timeRange,
      data: rateData,
      statistics
    };
  }

  /**
   * Get system-wide conversion statistics
   */
  async getSystemStats(timeRange = '24H') {
    const endDate = new Date();
    const startDate = this.getStartDateFromRange(timeRange);

    const stats = await ConversionEvent.findAll({
      where: {
        transaction_timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [fn('COUNT', col('id')), 'total_conversions'],
        [fn('COUNT', fn('DISTINCT', col('user_address'))), 'unique_users'],
        [fn('SUM', col('source_amount')), 'total_volume'],
        [fn('AVG', col('exchange_rate')), 'avg_exchange_rate'],
        [fn('AVG', col('slippage_percentage')), 'avg_slippage'],
        [fn('SUM', col('gas_fee_xlm')), 'total_gas_fees']
      ],
      raw: true
    });

    // Get top assets by volume
    const topAssets = await ConversionEvent.findAll({
      where: {
        transaction_timestamp: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'source_asset_code',
        [fn('SUM', col('source_amount')), 'total_volume'],
        [fn('COUNT', col('id')), 'transaction_count']
      ],
      group: ['source_asset_code'],
      order: [[literal('total_volume'), 'DESC']],
      limit: 10
    });

    return {
      timeRange,
      period: { start: startDate, end: endDate },
      overview: stats[0] || {},
      topAssets
    };
  }

  /**
   * Helper function to get start date from time range
   */
  getStartDateFromRange(range) {
    const now = new Date();
    switch (range) {
      case '1H':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24H':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7D':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '1M':
        return new Date(now.setMonth(now.getMonth() - 1));
      case '3M':
        return new Date(now.setMonth(now.getMonth() - 3));
      case '6M':
        return new Date(now.setMonth(now.getMonth() - 6));
      case '1Y':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Calculate median value
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2 
      : sorted[mid];
  }

  /**
   * Calculate volatility (standard deviation)
   */
  calculateVolatility(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate price trend (linear regression slope)
   */
  calculateTrend(values) {
    const n = values.length;
    if (n < 2) return 0;

    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((total, xi, i) => total + xi * y[i], 0);
    const sumXX = x.reduce((total, xi) => total + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }
}

module.exports = new PathPaymentAnalyticsService();
