const crypto = require('crypto');
const { sequelize } = require('../database/connection');
const PartnerManagement = require('../models/partnerManagement');
const PartnerUsageTracking = require('../models/partnerUsageTracking');
const { Op } = require('sequelize');

/**
 * PartnerManagementService
 * Manages institutional partners with tiered API access, usage tracking, and reporting
 */
class PartnerManagementService {
  constructor() {
    this.rateLimitWindows = new Map(); // In-memory rate limit tracking
  }

  /**
   * Generate a secure API key
   * @returns {string} Generated API key
   */
  generateApiKey() {
    return `pk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Generate API secret
   * @returns {string} Generated API secret
   */
  generateApiSecret() {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Hash API secret for storage
   * @param {string} secret - Secret to hash
   * @returns {string} Hashed secret
   */
  hashSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  /**
   * Register a new partner
   * @param {Object} params - Partner registration parameters
   * @returns {Promise<Object>} Created partner with API credentials
   */
  async registerPartner({ 
    partnerName, 
    partnerTier = 'basic',
    contactEmail,
    contactAddress,
    approvedBy 
  }) {
    const transaction = await sequelize.transaction();
    
    try {
      // Check if partner already exists
      const existing = await PartnerManagement.findOne({
        where: { partner_name: partnerName },
        transaction
      });

      if (existing) {
        throw new Error('Partner with this name already exists');
      }

      // Generate API credentials
      const apiKey = this.generateApiKey();
      const apiSecret = this.generateApiSecret();
      const apiSecretHash = this.hashSecret(apiSecret);

      // Get tier configuration
      const tierConfig = PartnerManagement.TIER_CONFIG[partnerTier];

      if (!tierConfig) {
        throw new Error(`Invalid partner tier: ${partnerTier}`);
      }

      // Create partner record
      const partner = await PartnerManagement.create({
        partner_name: partnerName,
        partner_tier: partnerTier,
        api_key: apiKey,
        api_secret_hash: apiSecretHash,
        contact_email: contactEmail,
        contact_address: contactAddress,
        rate_limit_per_minute: tierConfig.rateLimitPerMinute,
        rate_limit_per_day: tierConfig.rateLimitPerDay,
        max_requests_per_batch: tierConfig.maxBatchSize,
        features_enabled: tierConfig.features,
        approved_by: approvedBy,
        approved_at: new Date(),
        is_active: true,
        is_suspended: false
      }, { transaction });

      await transaction.commit();

      // Return partner with unhashed secret (only time it's exposed)
      return {
        ...partner.toJSON(),
        api_secret: apiSecret // Expose only once
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Verify API key and check rate limits
   * @param {string} apiKey - API key to verify
   * @param {string} endpoint - Endpoint being accessed
   * @returns {Promise<Object>} Verification result
   */
  async verifyApiKey(apiKey, endpoint) {
    const verification = await PartnerManagement.verifyApiKey(apiKey);

    if (!verification.valid) {
      return verification;
    }

    const { partner, rateLimits } = verification;

    // Check rate limits
    const rateLimitStatus = await this.checkRateLimits(partner.id, rateLimits);

    if (!rateLimitStatus.allowed) {
      return {
        valid: false,
        error: 'Rate limit exceeded',
        rateLimitStatus,
        retryAfter: rateLimitStatus.retryAfter
      };
    }

    // Update last_used_at
    await PartnerManagement.update(
      { last_used_at: new Date() },
      { where: { id: partner.id } }
    );

    return {
      valid: true,
      partner,
      rateLimits,
      rateLimitStatus
    };
  }

  /**
   * Check rate limits for a partner
   * @param {string} partnerId - Partner ID
   * @param {Object} rateLimits - Rate limit configuration
   * @returns {Promise<Object>} Rate limit status
   */
  async checkRateLimits(partnerId, rateLimits) {
    const now = new Date();
    const currentMinute = new Date(now.setSeconds(0, 0));
    const currentDay = new Date(now.setHours(0, 0, 0, 0));

    // Get usage counts
    const [minuteUsage, dayUsage] = await Promise.all([
      PartnerUsageTracking.count({
        where: {
          partner_id: partnerId,
          request_timestamp: {
            [Op.gte]: currentMinute
          }
        }
      }),
      PartnerUsageTracking.count({
        where: {
          partner_id: partnerId,
          request_timestamp: {
            [Op.gte]: currentDay
          }
        }
      })
    ]);

    const allowed = (
      (rateLimits.perDay === -1 || minuteUsage < rateLimits.perMinute) &&
      (rateLimits.perDay === -1 || dayUsage < rateLimits.perDay)
    );

    return {
      allowed,
      minuteUsage,
      dayUsage,
      minuteLimit: rateLimits.perMinute,
      dayLimit: rateLimits.perDay,
      remainingMinute: Math.max(0, rateLimits.perMinute - minuteUsage),
      remainingDay: rateLimits.perDay === -1 ? -1 : Math.max(0, rateLimits.perDay - dayUsage),
      retryAfter: allowed ? null : 60 // Retry after 1 minute
    };
  }

  /**
   * Track API request for a partner
   * @param {Object} requestData - Request data to track
   */
  async trackRequest(requestData) {
    const billingPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    await PartnerUsageTracking.trackRequest({
      ...requestData,
      billing_period: billingPeriod
    });
  }

  /**
   * Generate monthly usage report for a partner
   * @param {string} partnerId - Partner ID
   * @param {string} billingPeriod - Billing period (YYYY-MM)
   * @returns {Promise<Object>} Monthly usage report
   */
  async generateMonthlyReport(partnerId, billingPeriod) {
    const partner = await PartnerManagement.findByPk(partnerId, {
      attributes: ['id', 'partner_name', 'partner_tier', 'contact_email']
    });

    if (!partner) {
      throw new Error('Partner not found');
    }

    const [
      usageStats,
      dailyBreakdown,
      topEndpoints
    ] = await Promise.all([
      PartnerUsageTracking.getUsageStats(partnerId, billingPeriod),
      PartnerUsageTracking.getDailyBreakdown(partnerId, billingPeriod),
      PartnerUsageTracking.getTopEndpoints(partnerId, billingPeriod, 10)
    ]);

    return {
      partner: partner.toJSON(),
      billingPeriod,
      generatedAt: new Date().toISOString(),
      summary: {
        totalRequests: parseInt(usageStats.total_requests) || 0,
        successfulRequests: parseInt(usageStats.successful_requests) || 0,
        failedRequests: parseInt(usageStats.failed_requests) || 0,
        successRate: usageStats.total_requests > 0 
          ? ((parseInt(usageStats.successful_requests) / parseInt(usageStats.total_requests)) * 100).toFixed(2)
          : 0,
        avgResponseTimeMs: parseFloat(usageStats.avg_response_time_ms) || 0,
        totalRequestBytes: parseInt(usageStats.total_request_bytes) || 0,
        totalResponseBytes: parseInt(usageStats.total_response_bytes) || 0
      },
      dailyBreakdown,
      topEndpoints,
      tierInfo: PartnerManagement.TIER_CONFIG[partner.partner_tier]
    };
  }

  /**
   * Get all active partners
   * @returns {Promise<Array>} List of active partners
   */
  async getActivePartners() {
    return await PartnerManagement.findAll({
      where: {
        is_active: true,
        is_suspended: false
      },
      attributes: {
        exclude: ['api_secret_hash']
      },
      order: [['created_at', 'DESC']]
    });
  }

  /**
   * Suspend a partner
   * @param {string} partnerId - Partner ID
   * @param {string} reason - Suspension reason
   * @param {string} suspendedBy - Admin address
   */
  async suspendPartner(partnerId, reason, suspendedBy) {
    await PartnerManagement.update(
      {
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date(),
        suspended_by: suspendedBy
      },
      { where: { id: partnerId } }
    );
  }

  /**
   * Reactivate a suspended partner
   * @param {string} partnerId - Partner ID
   */
  async reactivatePartner(partnerId) {
    await PartnerManagement.update(
      {
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null,
        suspended_by: null
      },
      { where: { id: partnerId } }
    );
  }

  /**
   * Update partner tier
   * @param {string} partnerId - Partner ID
   * @param {string} newTier - New tier level
   */
  async updatePartnerTier(partnerId, newTier) {
    const tierConfig = PartnerManagement.TIER_CONFIG[newTier];

    if (!tierConfig) {
      throw new Error(`Invalid tier: ${newTier}`);
    }

    await PartnerManagement.update(
      {
        partner_tier: newTier,
        rate_limit_per_minute: tierConfig.rateLimitPerMinute,
        rate_limit_per_day: tierConfig.rateLimitPerDay,
        max_requests_per_batch: tierConfig.maxBatchSize,
        features_enabled: tierConfig.features
      },
      { where: { id: partnerId } }
    );
  }

  /**
   * Regenerate API key for a partner
   * @param {string} partnerId - Partner ID
   * @returns {Promise<Object>} New API credentials
   */
  async regenerateApiKey(partnerId) {
    const transaction = await sequelize.transaction();
    
    try {
      const apiKey = this.generateApiKey();
      const apiSecret = this.generateApiSecret();
      const apiSecretHash = this.hashSecret(apiSecret);

      await PartnerManagement.update(
        {
          api_key: apiKey,
          api_secret_hash: apiSecretHash
        },
        { where: { id: partnerId } },
        { transaction }
      );

      await transaction.commit();

      return {
        api_key: apiKey,
        api_secret: apiSecret
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new PartnerManagementService();
