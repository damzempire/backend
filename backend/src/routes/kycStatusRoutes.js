const express = require('express');
const router = express.Router();
const KycStatus = require('../models/KycStatus');
const KycStatusExpirationWorker = require('../jobs/kycStatusExpirationWorker');
const authService = require('../services/authService');
const { Op } = require('sequelize');

const kycWorker = new KycStatusExpirationWorker();

// GET /api/kyc-status/user/:userAddress
// Get KYC status for a specific user
router.get(
  '/user/:userAddress',
  authService.authenticate(true), // Require authentication
  async (req, res) => {
    try {
      const { userAddress } = req.params;
      const { includeExpired = 'false' } = req.query;

      // Validate user address
      if (!userAddress) {
        return res.status(400).json({
          success: false,
          message: 'User address is required'
        });
      }

      const kycStatus = await KycStatus.findOne({
        where: { user_address: userAddress },
        include: [
          {
            model: require('../models').User,
            as: 'user',
            required: false,
            attributes: ['address', 'email']
          }
        }
      ]);

      if (!kycStatus) {
        return res.status(404).json({
          success: false,
          message: 'KYC status not found for this user'
        });
      }

      // Include expired status if requested
      let resultData = {
        userAddress,
        kycStatus: kycStatus.toJSON(),
        lastUpdated: kycStatus.updated_at
      };

      if (includeExpired === 'true') {
        const expiredStatuses = await KycStatus.findAll({
          where: {
            user_address: userAddress,
            kyc_status: 'EXPIRED'
          },
          order: [['expiration_date', 'DESC']],
          limit: 5
        });

        resultData.expiredHistory = expiredStatuses.map(status => status.toJSON());
      }

      res.json({
        success: true,
        data: resultData
      });

    } catch (error) {
      console.error('Error getting KYC status:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/kyc-status/expiring
// Get all users with expiring KYC statuses
router.get(
  '/expiring',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const { days = 7, includeCritical = 'true' } = req.query;

      // Validate parameters
      if (isNaN(days) || days < 1 || days > 30) {
        return res.status(400).json({
          success: false,
          message: 'Days parameter must be between 1 and 30'
        });
      }

      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - days);
      thresholdDate.setHours(0, 0, 0, 0);

      const whereClause = {
        expiration_date: {
          [Op.lte]: thresholdDate,
          [Op.gt]: new Date()
        },
        is_active: true,
        kyc_status: {
          [Op.notIn]: ['EXPIRED', 'SOFT_LOCKED']
        }
      };

      if (includeCritical === 'true') {
        // Include only critical expirations (≤3 days)
        const criticalThresholdDate = new Date();
        criticalThresholdDate.setDate(criticalThresholdDate.getDate() - 3);
        whereClause.expiration_date[Op.lte] = criticalThresholdDate;
      }

      const expiringStatuses = await KycStatus.findAll({
        where: whereClause,
        include: [
          {
            model: require('../models').User,
            as: 'user',
            required: false,
            attributes: ['address', 'email']
          }
        ],
        order: [['expiration_date', 'ASC']]
      });

      const result = expiringStatuses.map(status => ({
        ...status.toJSON(),
        daysUntilExpiration: status.days_until_expiration,
        isCritical: status.days_until_expiration <= 3
      }));

      res.json({
        success: true,
        data: {
          thresholdDays: days,
          expiringUsers: result,
          summary: {
            total: result.length,
            critical: result.filter(s => s.isCritical).length,
            soonExpiring: result.filter(s => !s.isCritical).length
          }
        }
      });

    } catch (error) {
      console.error('Error getting expiring KYC statuses:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/kyc-status/expired
// Get all users with expired KYC statuses
router.get(
  '/expired',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;

      const expiredStatuses = await KycStatus.findAll({
        where: {
          kyc_status: 'EXPIRED',
          is_active: true
        },
        include: [
          {
            model: require('../models').User,
            as: 'user',
            required: false,
            attributes: ['address', 'email']
          }
        ],
        order: [['expiration_date', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      const result = expiredStatuses.map(status => ({
        ...status.toJSON(),
        daysExpired: Math.abs(status.days_until_expiration) || 0
      }));

      res.json({
        success: true,
        data: {
          expiredUsers: result,
          summary: {
            total: result.length,
            averageDaysExpired: result.reduce((sum, s) => sum + s.daysExpired, 0) / result.length
          }
        },
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: result.length === parseInt(limit)
        }
      });

    } catch (error) {
      console.error('Error getting expired KYC statuses:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/kyc-status/statistics
// Get KYC status statistics
router.get(
  '/statistics',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const stats = await kycWorker.getDailyStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting KYC statistics:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/kyc-status/worker/start
// Start the KYC expiration worker
router.post(
  '/worker/start',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      await kycWorker.start();
      
      res.json({
        success: true,
        message: 'KYC expiration worker started'
      });

    } catch (error) {
      console.error('Error starting KYC expiration worker:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/kyc-status/worker/stop
// Stop the KYC expiration worker
router.post(
  '/worker/stop',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      await kycWorker.stop();
      
      res.json({
        success: true,
        message: 'KYC expiration worker stopped'
      });

    } catch (error) {
      console.error('Error stopping KYC expiration worker:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/kyc-status/worker/check
// Manually trigger expiration check
router.post(
  '/worker/check',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      await kycWorker.checkExpiringStatuses();
      
      res.json({
        success: true,
        message: 'Manual expiration check completed'
      });

    } catch (error) {
      console.error('Error triggering manual expiration check:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/kyc-status/:kycId/soft-lock
// Apply soft lock to a user's KYC status
router.post(
  '/:kycId/soft-lock',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const { kycId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Reason is required for soft lock'
        });
      }

      const kycStatus = await KycStatus.findByPk(kycId);
      
      if (!kycStatus) {
        return res.status(404).json({
          success: false,
          message: 'KYC status not found'
        });
      }

      await kycStatus.applySoftLock(reason);

      res.json({
        success: true,
        message: `Soft lock applied: ${reason}`
      });

    } catch (error) {
      console.error('Error applying soft lock:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/kyc-status/:kycId/remove-soft-lock
// Remove soft lock from a user's KYC status
router.post(
  '/:kycId/remove-soft-lock',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const { kycId } = req.params;
      const { reason } = req.body;

      const kycStatus = await KycStatus.findByPk(kycId);
      
      if (!kycStatus) {
        return res.status(404).json({
          success: false,
          message: 'KYC status not found'
        });
      }

      await kycStatus.removeSoftLock(reason);

      res.json({
        success: true,
        message: `Soft lock removed: ${reason}`
      });

    } catch (error) {
      console.error('Error removing soft lock:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// POST /api/kyc-status/:kycId/update-risk-score
// Update risk score for a user's KYC status
router.post(
  '/:kycId/update-risk-score',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const { kycId } = req.params;
      const { riskScore } = req.body;

      if (typeof riskScore !== 'number' || riskScore < 0 || riskScore > 1) {
        return res.status(400).json({
          success: false,
          message: 'Risk score must be a number between 0 and 1'
        });
      }

      const kycStatus = await KycStatus.findByPk(kycId);
      
      if (!kycStatus) {
        return res.status(404).json({
          success: false,
          message: 'KYC status not found'
        });
      }

      await kycStatus.updateRiskScore(riskScore);

      res.json({
        success: true,
        message: `Risk score updated to ${riskScore}`
      });

    } catch (error) {
      console.error('Error updating risk score:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/kyc-status/worker/status
// Get worker status
router.get(
  '/worker/status',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const status = kycWorker.getStatus();
      
      res.json({
        success: true,
        data: status
      });

    } catch (error) {
      console.error('Error getting worker status:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// GET /api/kyc-status/compliance-report
// Generate compliance report
router.get(
  '/compliance-report',
  authService.authenticate(true), // Require admin authentication
  async (req, res) => {
    try {
      const { days = 30 } = req.query;

      if (isNaN(days) || days < 1 || days > 90) {
        return res.status(400).json({
          success: false,
          message: 'Days parameter must be between 1 and 90'
        });
      }

      const stats = await kycWorker.getDailyStatistics();
      
      // Generate compliance report
      const reportData = {
        reportPeriod: days,
        generatedAt: new Date(),
        summary: {
          totalUsers: stats.totalUsers,
          verifiedUsers: stats.verifiedUsers,
          pendingUsers: stats.pendingUsers,
          expiredUsers: stats.expiredUsers,
          complianceRate: stats.complianceRate,
          softLockedUsers: stats.softLocked,
          riskDistribution: await this.getRiskDistribution()
        },
        recommendations: this.generateComplianceRecommendations(stats)
      };

      res.json({
        success: true,
        data: reportData
      });

    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
);

// Helper function to get risk distribution
async function getRiskDistribution() {
  try {
    const riskBreakdown = await KycStatus.findAll({
      attributes: [
        'risk_level',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: {
        is_active: true
      },
      group: ['risk_level'],
      raw: true
    });

    return riskBreakdown.reduce((acc, item) => {
      acc[item.risk_level] = parseInt(item.count);
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting risk distribution:', error);
    return {};
  }
}

// Helper function to generate compliance recommendations
function generateComplianceRecommendations(stats) {
  const recommendations = [];

  if (stats.expiredUsers > 0) {
    recommendations.push({
      type: 'compliance_action',
      priority: 'critical',
      title: 'Expired KYC Statuses Require Attention',
      description: `${stats.expiredUsers} users have expired KYC verification. Immediate action required to restore account access and ensure compliance.`,
      actionItems: [
        'Reach out to expired users with re-verification instructions',
        'Consider temporary restrictions until re-verification is complete',
        'Review verification process for potential issues causing expirations',
        'Update risk scores for expired users to maximum'
      ]
    });
  }

  if (stats.softLockedUsers > 0) {
    recommendations.push({
      type: 'compliance_review',
      priority: 'high',
      title: 'Soft-Locked Users Require Review',
      description: `${stats.softLockedUsers} users are currently soft-locked. Review the circumstances and determine if additional restrictions are necessary.`,
      actionItems: [
        'Review soft-lock reasons and timing',
        'Assess if soft-lock criteria are appropriate',
        'Consider graduated unlock process based on risk assessment'
      ]
    });
  }

  if (stats.complianceRate < 95) {
    recommendations.push({
      type: 'process_improvement',
      priority: 'medium',
      title: 'Low Compliance Rate Detected',
      description: `Current compliance rate is ${stats.complianceRate}%. Consider improving the KYC verification process or user education.`,
      actionItems: [
        'Analyze common reasons for verification failures',
        'Improve user guidance and support documentation',
        'Consider automated reminders for expiring KYC'
      ]
    });
  }

  if (stats.pendingUsers > stats.totalUsers * 0.1) {
    recommendations.push({
      type: 'user_engagement',
      priority: 'medium',
      title: 'High Number of Pending KYC',
      description: `${stats.pendingUsers} users (${((stats.pendingUsers / stats.totalUsers) * 100).toFixed(1)}%) have pending KYC verification. This may impact user experience and compliance.`,
      actionItems: [
        'Send reminder notifications for pending verifications',
        'Offer additional support channels for KYC completion',
        'Identify and address common verification barriers',
        'Consider simplifying the verification process'
      ]
    });
  }

  return recommendations;
}

module.exports = router;
