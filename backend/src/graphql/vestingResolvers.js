const { sequelize } = require('../database/connection');
const { 
  Vault, 
  SubSchedule, 
  Beneficiary, 
  ClaimsHistory, 
  Organization,
  VestingMilestone,
  Token,
  HistoricalTokenPrice
} = require('../models');
const { Op } = require('sequelize');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');

// Custom BigDecimal scalar for precise decimal handling
const BigDecimal = new GraphQLScalarType({
  name: 'BigDecimal',
  description: 'BigDecimal custom scalar type',
  serialize(value) {
    return value ? value.toString() : null;
  },
  parseValue(value) {
    return value ? parseFloat(value) : null;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT || ast.kind === Kind.FLOAT) {
      return parseFloat(ast.value);
    }
    return null;
  }
});

// Helper functions for pagination
function createPaginationInfo(count, hasNextPage, hasPreviousPage, startCursor, endCursor) {
  return {
    totalCount: count,
    hasNextPage,
    hasPreviousPage,
    startCursor,
    endCursor
  };
}

function createCursor(node) {
  return Buffer.from(`${node.id}:${node.updatedAt.getTime()}`).toString('base64');
}

function parseCursor(cursor) {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [id, timestamp] = decoded.split(':');
    return { id, timestamp: new Date(parseInt(timestamp)) };
  } catch {
    return null;
  }
}

// Main resolvers
const vestingResolvers = {
  BigDecimal,

  Query: {
    /**
     * Get user's complete vesting history with optimized queries
     */
    async vestingHistory(_, { userAddress, filter = {}, pagination = {}, sort = {} }) {
      const { first = 50, after, last, before } = pagination;
      const { field = 'updatedAt', direction = 'ASC' } = sort;
      const limit = Math.min(first || last, 100); // Max 100 items per page
      const offset = after ? 1 : 0;

      // Build where clause
      const whereClause = {
        '$vault.beneficiaries.address$': userAddress,
        ...filter
      };

      // Add date range filter
      if (filter.dateRange) {
        if (filter.dateRange.startDate) {
          whereClause.createdAt = { [Op.gte]: filter.dateRange.startDate };
        }
        if (filter.dateRange.endDate) {
          whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: filter.dateRange.endDate };
        }
      }

      // Add cursor-based pagination
      if (after) {
        const cursorData = parseCursor(after);
        if (cursorData) {
          whereClause[Op.and] = [
            sequelize.where(
              sequelize.literal(`("SubSchedule"."id", "SubSchedule"."updated_at") > (:cursorId, :cursorTimestamp)`),
              { cursorId: cursorData.id, cursorTimestamp: cursorData.timestamp }
            )
          ];
        }
      }

      // Execute optimized query with joins
      const { count, rows: schedules } = await SubSchedule.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Vault,
            as: 'vault',
            include: [
              {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'name']
              },
              {
                model: Token,
                as: 'token',
                attributes: ['address', 'symbol', 'decimals']
              }
            ],
            attributes: ['id', 'address', 'name', 'owner_address', 'token_address']
          },
          {
            model: ClaimsHistory,
            as: 'claims',
            separate: true,
            order: [['claim_timestamp', 'DESC']],
            limit: 10 // Recent claims only
          }
        ],
        order: [[field, direction.toUpperCase()]],
        limit: limit + offset,
        subQuery: false
      });

      // Apply offset for cursor pagination
      const paginatedSchedules = offset > 0 ? schedules.slice(offset) : schedules;

      // Calculate vesting details for each schedule
      const enrichedSchedules = await Promise.all(
        paginatedSchedules.map(async (schedule) => {
          const now = new Date();
          const isCliffPassed = !schedule.cliff_date || schedule.cliff_date <= now;
          const isFullyVested = schedule.end_timestamp <= now;
          
          // Calculate vested amount
          let vestedAmount = '0';
          let withdrawableAmount = '0';
          let vestingProgress = 0;

          if (isCliffPassed) {
            const timePassed = Math.max(0, now - schedule.vesting_start_date);
            const totalVestingTime = schedule.vesting_duration * 1000; // Convert to milliseconds
            vestingProgress = Math.min(1, timePassed / totalVestingTime);
            vestedAmount = (parseFloat(schedule.top_up_amount) * vestingProgress).toString();
            withdrawableAmount = Math.max(0, parseFloat(vestedAmount) - parseFloat(schedule.amount_withdrawn)).toString();
          }

          return {
            ...schedule.toJSON(),
            beneficiaryAddress: userAddress,
            organizationName: schedule.vault?.organization?.name || null,
            totalAllocated: schedule.top_up_amount,
            totalWithdrawn: schedule.amount_withdrawn,
            remainingAmount: (parseFloat(schedule.top_up_amount) - parseFloat(schedule.amount_withdrawn)).toString(),
            isActive: schedule.is_active,
            isFullyVested,
            isCliffPassed,
            vestingProgress,
            vestedAmount,
            withdrawableAmount,
            nextVestTime: isFullyVested ? null : schedule.end_timestamp
          };
        })
      );

      // Create edges and pageInfo
      const edges = enrichedSchedules.map(schedule => ({
        node: schedule,
        cursor: createCursor(schedule)
      }));

      const pageInfo = createPaginationInfo(
        count,
        enrichedSchedules.length >= limit,
        offset > 0,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return {
        edges,
        pageInfo,
        totalCount: count
      };
    },

    /**
     * Get comprehensive vesting summary for a user
     */
    async vestingSummary(_, { userAddress }) {
      const now = new Date();

      // Get all schedules for the user with optimized query
      const schedules = await SubSchedule.findAll({
        where: {
          '$vault.beneficiaries.address$': userAddress
        },
        include: [
          {
            model: Vault,
            as: 'vault',
            include: [
              {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: ClaimsHistory,
            as: 'claims',
            separate: true,
            order: [['claim_timestamp', 'DESC']],
            limit: 5 // Recent claims only
          }
        ],
        subQuery: false
      });

      // Calculate summary statistics
      let totalAllocated = 0;
      let totalWithdrawn = 0;
      let activeVaults = 0;
      let completedVaults = 0;
      let totalProgress = 0;
      let nextClaimAmount = 0;
      let nextClaimTime = null;

      const recentClaims = [];
      const upcomingMilestones = [];

      for (const schedule of schedules) {
        const isCliffPassed = !schedule.cliff_date || schedule.cliff_date <= now;
        const isFullyVested = schedule.end_timestamp <= now;
        const isActive = schedule.is_active && !isFullyVested;

        totalAllocated += parseFloat(schedule.top_up_amount);
        totalWithdrawn += parseFloat(schedule.amount_withdrawn);

        if (isActive) activeVaults++;
        if (isFullyVested) completedVaults++;

        // Calculate progress
        let progress = 0;
        if (isCliffPassed) {
          const timePassed = Math.max(0, now - schedule.vesting_start_date);
          const totalVestingTime = schedule.vesting_duration * 1000;
          progress = Math.min(1, timePassed / totalVestingTime);
          totalProgress += progress;

          // Calculate withdrawable amount
          const vestedAmount = parseFloat(schedule.top_up_amount) * progress;
          const withdrawable = Math.max(0, vestedAmount - parseFloat(schedule.amount_withdrawn));
          
          if (withdrawable > 0) {
            nextClaimAmount += withdrawable;
            if (!nextClaimTime || schedule.end_timestamp < nextClaimTime) {
              nextClaimTime = schedule.end_timestamp;
            }
          }
        }

        // Add recent claims
        if (schedule.claims) {
          recentClaims.push(...schedule.claims.map(claim => ({
            ...claim.toJSON(),
            vaultId: schedule.vault_id,
            vaultAddress: schedule.vault?.address
          })));
        }
      }

      const totalRemaining = totalAllocated - totalWithdrawn;
      const averageProgress = schedules.length > 0 ? totalProgress / schedules.length : 0;

      // Sort recent claims and take latest 5
      recentClaims.sort((a, b) => new Date(b.claim_timestamp) - new Date(a.claim_timestamp));
      const latestClaims = recentClaims.slice(0, 5);

      return {
        userAddress,
        totalVaults: schedules.length,
        activeVaults,
        completedVaults,
        totalAllocated: totalAllocated.toString(),
        totalWithdrawn: totalWithdrawn.toString(),
        totalRemaining: totalRemaining.toString(),
        totalValueUsd: '0', // TODO: Calculate based on current token prices
        averageVestingProgress: averageProgress,
        nextClaimAmount: nextClaimAmount.toString(),
        nextClaimTime,
        recentClaims: latestClaims,
        upcomingMilestones
      };
    },

    /**
     * Get specific vesting schedule by ID
     */
    async vestingSchedule(_, { id }) {
      const schedule = await SubSchedule.findByPk(id, {
        include: [
          {
            model: Vault,
            as: 'vault',
            include: [
              {
                model: Organization,
                as: 'organization',
                attributes: ['id', 'name']
              },
              {
                model: Token,
                as: 'token',
                attributes: ['address', 'symbol', 'decimals']
              }
            ]
          },
          {
            model: ClaimsHistory,
            as: 'claims',
            order: [['claim_timestamp', 'DESC']]
          }
        ]
      });

      if (!schedule) return null;

      const now = new Date();
      const isCliffPassed = !schedule.cliff_date || schedule.cliff_date <= now;
      const isFullyVested = schedule.end_timestamp <= now;
      
      let vestedAmount = '0';
      let withdrawableAmount = '0';
      let vestingProgress = 0;

      if (isCliffPassed) {
        const timePassed = Math.max(0, now - schedule.vesting_start_date);
        const totalVestingTime = schedule.vesting_duration * 1000;
        vestingProgress = Math.min(1, timePassed / totalVestingTime);
        vestedAmount = (parseFloat(schedule.top_up_amount) * vestingProgress).toString();
        withdrawableAmount = Math.max(0, parseFloat(vestedAmount) - parseFloat(schedule.amount_withdrawn)).toString();
      }

      return {
        ...schedule.toJSON(),
        beneficiaryAddress: schedule.vault?.beneficiaries?.[0]?.address || null,
        organizationName: schedule.vault?.organization?.name || null,
        totalAllocated: schedule.top_up_amount,
        totalWithdrawn: schedule.amount_withdrawn,
        remainingAmount: (parseFloat(schedule.top_up_amount) - parseFloat(schedule.amount_withdrawn)).toString(),
        isActive: schedule.is_active,
        isFullyVested,
        isCliffPassed,
        vestingProgress,
        vestedAmount,
        withdrawableAmount,
        nextVestTime: isFullyVested ? null : schedule.end_timestamp
      };
    },

    /**
     * Get claim history for a user
     */
    async claimHistory(_, { userAddress, vaultId, pagination = {}, sort = {} }) {
      const { first = 50, after } = pagination;
      const { field = 'claim_timestamp', direction = 'DESC' } = sort;
      const limit = Math.min(first, 100);

      const whereClause = { user_address: userAddress };
      if (vaultId) {
        // Join with sub_schedules to filter by vault
        whereClause[Op.and] = [
          sequelize.where(
            sequelize.literal(`EXISTS (
              SELECT 1 FROM sub_schedules ss 
              JOIN vaults v ON ss.vault_id = v.id 
              JOIN beneficiaries b ON v.id = b.vault_id 
              WHERE ss.id = claims_history.vault_id AND b.address = :userAddress
              ${vaultId ? 'AND ss.id = :vaultId' : ''}
            )`),
            { userAddress, ...(vaultId && { vaultId }) }
          )
        ];
      }

      const { count, rows: claims } = await ClaimsHistory.findAndCountAll({
        where: whereClause,
        order: [[field, direction.toUpperCase()]],
        limit,
        include: [
          {
            model: SubSchedule,
            as: 'subSchedule',
            attributes: ['vault_id'],
            include: [
              {
                model: Vault,
                as: 'vault',
                attributes: ['address', 'name']
              }
            ]
          }
        ]
      });

      const enrichedClaims = claims.map(claim => ({
        ...claim.toJSON(),
        vaultId: claim.subSchedule?.vault_id,
        vaultAddress: claim.subSchedule?.vault?.address,
        usdValue: claim.price_at_claim_usd || '0'
      }));

      const edges = enrichedClaims.map(claim => ({
        node: claim,
        cursor: createCursor(claim)
      }));

      const pageInfo = createPaginationInfo(
        count,
        claims.length >= limit,
        false,
        edges[0]?.cursor,
        edges[edges.length - 1]?.cursor
      );

      return {
        edges,
        pageInfo,
        totalCount: count
      };
    },

    /**
     * Get vesting statistics
     */
    async vestingStatistics(_, { organizationId, dateRange }) {
      const whereClause = {};
      
      if (dateRange) {
        if (dateRange.startDate) {
          whereClause.createdAt = { [Op.gte]: dateRange.startDate };
        }
        if (dateRange.endDate) {
          whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: dateRange.endDate };
        }
      }

      // Add organization filter
      if (organizationId) {
        whereClause['$vault.organization_id$'] = organizationId;
      }

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [totalSchedules, activeSchedules, completedSchedules] = await Promise.all([
        SubSchedule.count({ where: whereClause }),
        SubSchedule.count({ 
          where: { 
            ...whereClause,
            is_active: true,
            end_timestamp: { [Op.gt]: now }
          }
        }),
        SubSchedule.count({ 
          where: { 
            ...whereClause,
            end_timestamp: { [Op.lte]: now }
          }
        })
      ]);

      // Get financial aggregates
      const [totalAllocated, totalWithdrawn] = await Promise.all([
        SubSchedule.sum('top_up_amount', { where: whereClause }) || 0,
        SubSchedule.sum('amount_withdrawn', { where: whereClause }) || 0
      ]);

      // Get claim statistics
      const [claims24h, claims7d, claims30d] = await Promise.all([
        ClaimsHistory.count({
          where: {
            ...whereClause,
            claim_timestamp: { [Op.gte]: yesterday }
          }
        }),
        ClaimsHistory.count({
          where: {
            ...whereClause,
            claim_timestamp: { [Op.gte]: sevenDaysAgo }
          }
        }),
        ClaimsHistory.count({
          where: {
            ...whereClause,
            claim_timestamp: { [Op.gte]: thirtyDaysAgo }
          }
        })
      ]);

      // Get performance metrics
      const [avgVestingDuration, avgCliffDuration] = await Promise.all([
        SubSchedule.average('vesting_duration', { where: whereClause }) || 0,
        SubSchedule.average('cliff_duration', { where: whereClause }) || 0
      ]);

      return {
        totalVaults: totalSchedules,
        activeVaults: activeSchedules,
        completedVaults: completedSchedules,
        totalAllocated: totalAllocated.toString(),
        totalWithdrawn: totalWithdrawn.toString(),
        totalRemaining: (totalAllocated - totalWithdrawn).toString(),
        claimsLast24h: claims24h,
        claimsLast7d: claims7d,
        claimsLast30d: claims30d,
        averageVestingDuration: Math.round(avgVestingDuration),
        averageCliffDuration: Math.round(avgCliffDuration)
      };
    },

    /**
     * Search vesting schedules
     */
    async searchVestingSchedules(_, { query, userAddress, pagination = {} }) {
      const { first = 50 } = pagination;
      const limit = Math.min(first, 100);

      const searchQuery = `%${query}%`;
      
      const schedules = await SubSchedule.findAll({
        where: {
          '$vault.beneficiaries.address$': userAddress,
          [Op.or]: [
            { '$vault.name$': { [Op.iLike]: searchQuery } },
            { '$vault.address$': { [Op.iLike]: searchQuery } },
            { transaction_hash: { [Op.iLike]: searchQuery } }
          ]
        },
        include: [
          {
            model: Vault,
            as: 'vault',
            attributes: ['id', 'address', 'name', 'owner_address', 'token_address']
          }
        ],
        limit,
        order: [['updated_at', 'DESC']]
      });

      const edges = schedules.map(schedule => ({
        node: {
          ...schedule.toJSON(),
          beneficiaryAddress: userAddress
        },
        cursor: createCursor(schedule)
      }));

      return {
        edges,
        pageInfo: createPaginationInfo(schedules.length, false, false, null, null),
        totalCount: schedules.length
      };
    },

    /**
     * Get upcoming milestones for a user
     */
    async upcomingMilestones(_, { userAddress, daysAhead = 30 }) {
      const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

      const milestones = await VestingMilestone.findAll({
        where: {
          targetDate: {
            [Op.between]: [new Date(), futureDate]
          },
          isCompleted: false,
          '$vault.beneficiaries.address$': userAddress
        },
        include: [
          {
            model: Vault,
            as: 'vault',
            attributes: ['id', 'address', 'name']
          }
        ],
        order: [['targetDate', 'ASC']]
      });

      return milestones.map(milestone => milestone.toJSON());
    },

    /**
     * Get vesting analytics
     */
    async vestingAnalytics(_, { userAddress, period = '30d' }) {
      const periodMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      
      const days = periodMap[period] || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      // Get claims in period
      const claims = await ClaimsHistory.findAll({
        where: {
          user_address: userAddress,
          claim_timestamp: {
            [Op.between]: [startDate, endDate]
          }
        },
        order: [['claim_timestamp', 'ASC']]
      });

      // Get schedules for progress calculation
      const schedules = await SubSchedule.findAll({
        where: {
          '$vault.beneficiaries.address$': userAddress
        },
        include: [
          {
            model: Vault,
            as: 'vault'
          }
        ]
      });

      // Calculate analytics
      const totalClaims = claims.length;
      const totalClaimedAmount = claims.reduce((sum, claim) => sum + parseFloat(claim.amount_claimed), 0);
      const averageClaimAmount = totalClaims > 0 ? totalClaimedAmount / totalClaims : 0;
      const claimFrequency = totalClaims / days;

      // Calculate vesting progress
      const startProgress = calculateAverageProgress(schedules, startDate);
      const endProgress = calculateAverageProgress(schedules, endDate);
      const progressChange = endProgress - startProgress;

      // Generate daily data
      const dailyClaims = generateDailyClaimsData(claims, startDate, endDate);
      const cumulativeVesting = generateCumulativeVestingData(schedules, startDate, endDate);

      return {
        period,
        startDate,
        endDate,
        totalClaims,
        totalClaimedAmount: totalClaimedAmount.toString(),
        averageClaimAmount: averageClaimAmount.toString(),
        claimFrequency,
        vestingProgressStart: startProgress,
        vestingProgressEnd: endProgress,
        vestingProgressChange: progressChange,
        totalValueUsd: '0', // TODO: Calculate based on token prices
        averageValuePerClaim: '0', // TODO: Calculate based on token prices
        dailyClaims,
        cumulativeVesting
      };
    }
  },

  Mutation: {
    /**
     * Refresh vesting calculations
     */
    async refreshVestingCalculations(_, { vaultId }) {
      // TODO: Implement recalculation logic
      // This would trigger a recalculation of vested amounts for a vault
      return true;
    },

    /**
     * Complete milestone
     */
    async completeMilestone(_, { milestoneId }) {
      const milestone = await VestingMilestone.findByPk(milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      milestone.isCompleted = true;
      milestone.completedAt = new Date();
      await milestone.save();

      return milestone;
    }
  }
};

// Helper functions
function calculateAverageProgress(schedules, date) {
  if (schedules.length === 0) return 0;
  
  let totalProgress = 0;
  for (const schedule of schedules) {
    const isCliffPassed = !schedule.cliff_date || schedule.cliff_date <= date;
    if (isCliffPassed) {
      const timePassed = Math.max(0, date - schedule.vesting_start_date);
      const totalVestingTime = schedule.vesting_duration * 1000;
      totalProgress += Math.min(1, timePassed / totalVestingTime);
    }
  }
  
  return totalProgress / schedules.length;
}

function generateDailyClaimsData(claims, startDate, endDate) {
  const dailyData = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayClaims = claims.filter(claim => {
      const claimDate = new Date(claim.claim_timestamp);
      return claimDate.toDateString() === currentDate.toDateString();
    });
    
    dailyData.push({
      date: new Date(currentDate),
      claimsCount: dayClaims.length,
      amountClaimed: dayClaims.reduce((sum, claim) => sum + parseFloat(claim.amount_claimed), 0).toString(),
      valueUsd: '0' // TODO: Calculate based on token prices
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dailyData;
}

function generateCumulativeVestingData(schedules, startDate, endDate) {
  const cumulativeData = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    let cumulativeVested = 0;
    let cumulativeClaimed = 0;
    
    for (const schedule of schedules) {
      const isCliffPassed = !schedule.cliff_date || schedule.cliff_date <= currentDate;
      if (isCliffPassed) {
        const timePassed = Math.max(0, currentDate - schedule.vesting_start_date);
        const totalVestingTime = schedule.vesting_duration * 1000;
        const progress = Math.min(1, timePassed / totalVestingTime);
        cumulativeVested += parseFloat(schedule.top_up_amount) * progress;
      }
      cumulativeClaimed += parseFloat(schedule.amount_withdrawn);
    }
    
    const progress = cumulativeVested > 0 ? cumulativeClaimed / cumulativeVested : 0;
    
    cumulativeData.push({
      date: new Date(currentDate),
      cumulativeVested: cumulativeVested.toString(),
      cumulativeClaimed: cumulativeClaimed.toString(),
      progress
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return cumulativeData;
}

module.exports = vestingResolvers;
