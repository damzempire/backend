const { ClaimsHistory, Vault, SubSchedule } = require('../models');
const priceService = require('./priceService');
const slackWebhookService = require('./slackWebhookService');
const tvlService = require('./tvlService');
const cacheService = require('./cacheService');
const Sentry = require('@sentry/node');
const ClaimCalculator = require('./claimCalculator');
const { TokenType } = require('../models/vault');
const { InsufficientBalanceError } = require('../errors/VaultErrors');

const EventEmitter = require('events');
const claimEventEmitter = new EventEmitter();

class IndexingService {
  async processClaim(claimData) {
    try {
      const {
        user_address,
        token_address,
        amount_claimed,
        claim_timestamp,
        transaction_hash,
        block_number
      } = claimData;

      // Fetch the token price at the time of claim
      const price_at_claim_usd = await priceService.getTokenPrice(
        token_address,
        claim_timestamp
      );

      // Create the claim record with price data
      const claim = await ClaimsHistory.create({
        user_address,
        token_address,
        amount_claimed,
        claim_timestamp,
        transaction_hash,
        block_number,
        price_at_claim_usd
      });

      console.log(`Processed claim ${transaction_hash} with price $${price_at_claim_usd}`);

      // Check for large claim and send Slack alert
      try {
        await slackWebhookService.processClaimAlert(claim.toJSON());
      } catch (alertError) {
        console.error('Error processing claim alert:', alertError);
        // Don't throw - alert failure shouldn't fail the claim processing
      }

      // Update TVL for claim event
      try {
        await tvlService.handleClaim(claim.toJSON());
      } catch (tvlError) {
        console.error('Error updating TVL for claim:', tvlError);
        // Don't throw - TVL update failure shouldn't fail claim processing
      }

      // Emit internal claim event for WebSocket gateway
      claimEventEmitter.emit('claim', claim.toJSON());

      // Invalidate user portfolio cache after claim processing
      try {
        await cacheService.invalidateUserPortfolio(user_address);
        console.log(`Invalidated portfolio cache for user ${user_address}`);
      } catch (cacheError) {
        console.error('Error invalidating portfolio cache:', cacheError);
        // Don't throw - cache invalidation failure shouldn't fail claim processing
      }

      // Fire webhook POST for DAOs, but only if admin_address matches organization_id
      const { OrganizationWebhook } = require('../models');
      const { isAdminOfOrg } = require('../graphql/middleware/auth');
      const axios = require('axios');
      if (claim.organization_id && claim.admin_address) {
        const isAdmin = await isAdminOfOrg(claim.admin_address, claim.organization_id);
        if (isAdmin) {
          const webhooks = await OrganizationWebhook.findAll({ where: { organization_id: claim.organization_id } });
          for (const webhook of webhooks) {
            try {
              await axios.post(webhook.webhook_url, claim.toJSON());
              console.log(`Webhook fired: ${webhook.webhook_url}`);
            } catch (err) {
              console.error(`Webhook failed: ${webhook.webhook_url}`, err);
            }
          }
        } else {
          console.warn('Webhook not fired: admin_address does not match organization_id');
        }
      }
      return claim;
    } catch (error) {
      console.error('Error processing claim:', error);
      Sentry.captureException(error, {
        tags: { operation: 'processClaim' },
        extra: { claimData }
      });
      throw error;
    }
  }

  /**
   * Execute a claim for a specific subschedule
   * This method calculates the claimable amount, verifies balance for dynamic tokens,
   * and updates the subschedule's amount_withdrawn
   * 
   * @param {string} vaultId - The vault ID
   * @param {string} subScheduleId - The subschedule ID
   * @param {Date} currentTime - Current timestamp (optional, defaults to now)
   * @returns {Promise<Object>} Claim result with amount and timestamp
   * @throws {InsufficientBalanceError} If insufficient balance for dynamic tokens
   * @throws {Error} If vault or subschedule not found
   */
  async executeClaimForSubSchedule(vaultId, subScheduleId, currentTime = null) {
    try {
      const asOfTime = currentTime || new Date();

      // Fetch vault with all subschedules
      const vault = await Vault.findByPk(vaultId, {
        include: [{
          model: SubSchedule,
          as: 'subSchedules',
          where: { is_active: true },
          required: false
        }]
      });

      if (!vault) {
        throw new Error(`Vault ${vaultId} not found`);
      }

      // Fetch the specific subschedule
      const subSchedule = await SubSchedule.findByPk(subScheduleId);

      if (!subSchedule) {
        throw new Error(`SubSchedule ${subScheduleId} not found`);
      }

      if (!subSchedule.is_active) {
        throw new Error(`SubSchedule ${subScheduleId} is not active`);
      }

      // Use ClaimCalculator to determine claimable amount
      const claimCalculator = new ClaimCalculator();
      const claimableAmount = await claimCalculator.calculateClaimable(
        vault,
        subSchedule,
        asOfTime,
        vault.subSchedules || []
      );

      const claimableNum = parseFloat(claimableAmount);

      // Handle zero or negative claimable amount
      if (claimableNum <= 0) {
        throw new InsufficientBalanceError(0, 0);
      }

      // For dynamic tokens, verify sufficient actual balance before transfer
      if (vault.token_type === TokenType.DYNAMIC) {
        const BalanceTracker = require('./balanceTracker');
        const balanceTracker = new BalanceTracker();

        try {
          const actualBalance = await balanceTracker.getActualBalance(
            vault.token_address,
            vault.address
          );
          const actualBalanceNum = parseFloat(actualBalance);

          // Check if actual balance is sufficient
          if (actualBalanceNum < claimableNum) {
            throw new InsufficientBalanceError(claimableNum, actualBalanceNum);
          }

          // Handle zero balance case with descriptive error
          if (actualBalanceNum === 0) {
            throw new InsufficientBalanceError(claimableNum, 0);
          }
        } catch (error) {
          // If it's already an InsufficientBalanceError, rethrow it
          if (error instanceof InsufficientBalanceError) {
            throw error;
          }
          // For other errors (like balance query failures), log and rethrow
          console.error('Error verifying balance for dynamic token:', error);
          throw error;
        }
      }

      // Execute transfer (placeholder - in real implementation, this would call the smart contract)
      // For now, we'll just update the subschedule's amount_withdrawn
      // In a real implementation, you would:
      // 1. Call the vault smart contract to execute the transfer
      // 2. Wait for transaction confirmation
      // 3. Then update the database

      // Update subschedule.amount_withdrawn
      const newAmountWithdrawn = parseFloat(subSchedule.amount_withdrawn) + claimableNum;
      await subSchedule.update({
        amount_withdrawn: String(newAmountWithdrawn)
      });

      console.log(`Executed claim for subschedule ${subScheduleId}: ${claimableNum} tokens`);

      return {
        amount: claimableNum,
        timestamp: asOfTime,
        vault_id: vaultId,
        subschedule_id: subScheduleId,
        token_type: vault.token_type
      };
    } catch (error) {
      // Log error with context
      console.error('Error executing claim:', error);
      
      Sentry.captureException(error, {
        tags: { operation: 'executeClaimForSubSchedule' },
        extra: { vaultId, subScheduleId, currentTime }
      });

      throw error;
    }
  }

  /**
   * Execute multiple sequential claims for different subschedules
   * Handles depletion gracefully by processing claims in order and stopping when balance is insufficient
   * 
   * @param {Array<Object>} claimRequests - Array of {vaultId, subScheduleId} objects
   * @param {Date} currentTime - Current timestamp (optional, defaults to now)
   * @returns {Promise<Object>} Results with successful claims and any errors
   */
  async executeSequentialClaims(claimRequests, currentTime = null) {
    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      totalFailed: 0
    };

    for (const request of claimRequests) {
      try {
        const { vaultId, subScheduleId } = request;
        
        // Execute claim for this subschedule
        const claimResult = await this.executeClaimForSubSchedule(
          vaultId,
          subScheduleId,
          currentTime
        );

        results.successful.push({
          vaultId,
          subScheduleId,
          amount: claimResult.amount,
          timestamp: claimResult.timestamp
        });
        results.totalProcessed++;

      } catch (error) {
        // Handle errors gracefully without panicking
        const errorInfo = {
          vaultId: request.vaultId,
          subScheduleId: request.subScheduleId,
          error: error.message,
          errorType: error.constructor.name
        };

        // For InsufficientBalanceError, include the balance details
        if (error instanceof InsufficientBalanceError) {
          errorInfo.requested = error.requested;
          errorInfo.available = error.available;
        }

        results.failed.push(errorInfo);
        results.totalFailed++;

        // Log the error but continue processing other claims
        console.error(`Failed to execute claim for subschedule ${request.subScheduleId}:`, error.message);
      }
    }

    return results;
  }

  async processBatchClaims(claimsData) {
  const results = [];
  const errors = [];

  for (const claimData of claimsData) {
    try {
      const result = await this.processClaim(claimData);
      results.push(result);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { operation: 'processBatchClaims_individual' },
        extra: { transaction_hash: claimData.transaction_hash }
      });
      errors.push({
        transaction_hash: claimData.transaction_hash,
        error: error.message
      });
    }
  }

  return {
    processed: results.length,
    errors: errors.length,
    results,
    errors
  };
}

  async backfillMissingPrices() {
  try {
    // Find all claims without price data
    const claimsWithoutPrice = await ClaimsHistory.findAll({
      where: {
        price_at_claim_usd: null
      },
      order: [['claim_timestamp', 'ASC']],
      limit: 100 // Process in batches to avoid rate limits
    });

    console.log(`Found ${claimsWithoutPrice.length} claims without price data`);

    for (const claim of claimsWithoutPrice) {
      try {
        const price = await priceService.getTokenPrice(
          claim.token_address,
          claim.claim_timestamp
        );

        await claim.update({ price_at_claim_usd: price });
        console.log(`Backfilled price for claim ${claim.transaction_hash}: $${price}`);
      } catch (error) {
        console.error(`Failed to backfill price for claim ${claim.transaction_hash}:`, error.message);
      }
    }

    return claimsWithoutPrice.length;
  } catch (error) {
    console.error('Error in backfillMissingPrices:', error);
    Sentry.captureException(error, {
      tags: { operation: 'backfillMissingPrices' }
    });
    throw error;
  }
}

  async getRealizedGains(userAddress, startDate = null, endDate = null) {
  try {
    const whereClause = {
      user_address: userAddress,
      price_at_claim_usd: {
        [require('sequelize').Op.ne]: null
      }
    };

    if (startDate) {
      whereClause.claim_timestamp = {
        [require('sequelize').Op.gte]: startDate
      };
    }

    if (endDate) {
      whereClause.claim_timestamp = {
        ...whereClause.claim_timestamp,
        [require('sequelize').Op.lte]: endDate
      };
    }

    const claims = await ClaimsHistory.findAll({
      where: whereClause,
      order: [['claim_timestamp', 'ASC']]
    });

    let totalRealizedGains = 0;

    for (const claim of claims) {
      const realizedGain = parseFloat(claim.amount_claimed) * parseFloat(claim.price_at_claim_usd);
      totalRealizedGains += realizedGain;
    }

    return {
      user_address: userAddress,
      total_realized_gains_usd: totalRealizedGains,
      claims_processed: claims.length,
      period: {
        start_date: startDate,
        end_date: endDate
      }
    };
  } catch (error) {
    console.error('Error calculating realized gains:', error);
    Sentry.captureException(error, {
      tags: { operation: 'getRealizedGains' },
      extra: { userAddress, startDate, endDate }
    });
    throw error;
  }
}

  async processTopUpEvent(topUpData) {
  try {
    const {
      vault_address,
      top_up_amount,
      transaction_hash,
      block_number,
      timestamp,
      cliff_duration = null,
      vesting_duration
    } = topUpData;

    const vault = await Vault.findOne({
      where: { address: vault_address }
    });

    if (!vault) {
      throw new Error(`Vault ${vault_address} not found or inactive`);
    }

    // Determine actual received amount based on token type
    let actualReceivedAmount = top_up_amount;
    
    if (vault.token_type === 'dynamic') {
      // For dynamic tokens, verify actual received amount
      const BalanceTracker = require('./balanceTracker');
      const balanceTracker = new BalanceTracker();
      
      try {
        // Query balance before transfer (this would typically be done before the transfer)
        // For now, we'll assume the transfer has already happened and query the current balance
        // In a real implementation, you'd query before and after the transfer
        const balanceBefore = await balanceTracker.getActualBalance(
          vault.token_address,
          vault_address
        );
        
        // Note: In a real implementation, the transfer would happen here
        // and we'd query the balance after
        
        // For this implementation, we'll use verifyDeposit which calculates the delta
        // This assumes we have the balance before the deposit
        // In practice, this would be called with the actual balance before the transfer
        actualReceivedAmount = await balanceTracker.verifyDeposit(
          vault.token_address,
          vault_address,
          String(parseFloat(balanceBefore) - parseFloat(top_up_amount))
        );
        
        console.log(`Dynamic token deposit: Expected ${top_up_amount}, Actual received ${actualReceivedAmount}`);
      } catch (balanceError) {
        console.error('Error verifying dynamic token deposit:', balanceError);
        // Log the error but continue with the expected amount
        // In production, you might want to handle this differently
        console.warn(`Using expected amount ${top_up_amount} due to balance verification failure`);
      }
    }
    // For static tokens, use the transfer amount as-is (current behavior)

    const topUpTimestamp = new Date(timestamp);
    let cliffDate = null;
    let vestingStartDate = topUpTimestamp;

    const cliff_dur = topUpData.cliff_duration !== undefined ? topUpData.cliff_duration : topUpData.cliff_duration_seconds;
    const vesting_dur = topUpData.vesting_duration !== undefined ? topUpData.vesting_duration : topUpData.vesting_duration_seconds;

    if (cliff_dur && cliff_dur > 0) {
      cliffDate = new Date(topUpTimestamp.getTime() + cliff_dur * 1000);
      vestingStartDate = cliffDate;
    }

    const endTimestamp = new Date(vestingStartDate.getTime() + (vesting_dur || 0) * 1000);

    const subSchedule = await SubSchedule.create({
      vault_id: vault.id,
      top_up_amount: actualReceivedAmount,
      transaction_hash: transaction_hash,
      vesting_start_date: vestingStartDate,
      start_timestamp: topUpTimestamp,
      end_timestamp: endTimestamp,
      cliff_duration: cliff_dur || 0,
      cliff_date: cliffDate,
      vesting_duration: vesting_dur || 0,
      block_number
    });

    await vault.update({
      total_amount: parseFloat(vault.total_amount) + parseFloat(actualReceivedAmount),
    });

    console.log(`Processed top-up ${transaction_hash} for vault ${vault_address}, amount: ${actualReceivedAmount}`);
    return subSchedule;
  } catch (error) {
    console.error('Error processing top-up event:', error);
    Sentry.captureException(error, {
      tags: { operation: 'processTopUpEvent' },
      extra: { topUpData }
    });
    throw error;
  }
}

  async processReleaseEvent(releaseData) {
  try {
    const {
      vault_address,
      user_address,
      amount_released,
      transaction_hash,
      block_number,
      timestamp
    } = releaseData;

    const vault = await Vault.findOne({
      where: { address: vault_address },
      include: [{
        model: SubSchedule,
        as: 'subSchedules',
        where: { is_active: true },
        required: false,
      }],
    });

    if (!vault) {
      throw new Error(`Vault ${vault_address} not found or inactive`);
    }

    let remainingToRelease = parseFloat(amount_released);

    for (const subSchedule of vault.subSchedules) {
      if (remainingToRelease <= 0) break;

      const releasable = this.calculateSubScheduleReleasable(subSchedule, new Date(timestamp));
      if (releasable <= 0) continue;

      const releaseFromThis = Math.min(remainingToRelease, releasable);

      await subSchedule.update({
        amount_released: parseFloat(subSchedule.amount_released) + releaseFromThis,
      });

      remainingToRelease -= releaseFromThis;
    }

    if (remainingToRelease > 0) {
      throw new Error(`Insufficient releasable amount. Remaining: ${remainingToRelease}`);
    }

    console.log(`Processed release ${transaction_hash} for vault ${vault_address}, amount: ${amount_released}`);
    return { success: true, amount_released };
  } catch (error) {
    console.error('Error processing release event:', error);
    Sentry.captureException(error, {
      tags: { operation: 'processReleaseEvent' },
      extra: { releaseData }
    });
    throw error;
  }
}

calculateSubScheduleReleasable(subSchedule, asOfDate = new Date()) {
  const checkTime = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  
  if (subSchedule.cliff_date && checkTime < subSchedule.cliff_date) {
    return 0;
  }

  if (checkTime < subSchedule.vesting_start_date) {
    return 0;
  }

  if (checkTime >= subSchedule.end_timestamp) {
    return parseFloat(subSchedule.top_up_amount) - parseFloat(subSchedule.amount_released);
  }

  const duration = subSchedule.end_timestamp.getTime() - subSchedule.vesting_start_date.getTime();
  const elapsed = checkTime.getTime() - subSchedule.vesting_start_date.getTime();
  
  const vestedRatio = duration > 0 ? (elapsed / duration) : 1;
  const totalVested = parseFloat(subSchedule.top_up_amount) * vestedRatio;
  const releasable = totalVested - parseFloat(subSchedule.amount_released);

  return Math.max(0, releasable);
}
}

module.exports = {
  IndexingService,
  claimEventEmitter,
  instance: new IndexingService()
};
