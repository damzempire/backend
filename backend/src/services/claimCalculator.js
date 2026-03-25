/**
 * ClaimCalculator - Service for calculating claimable amounts for vesting schedules
 * 
 * This service handles claim calculations for both static and dynamic tokens,
 * implementing proportional distribution for dynamic balance tokens.
 */

const BalanceTracker = require('./balanceTracker');
const { TokenType } = require('../models/vault');
const { OverflowError, DivisionByZeroError } = require('../errors/VaultErrors');

class ClaimCalculator {
  /**
   * Create a ClaimCalculator instance
   * @param {string} rpcUrl - Stellar RPC URL for querying balances (optional)
   */
  constructor(rpcUrl = null) {
    this.balanceTracker = new BalanceTracker(rpcUrl);
  }

  /**
   * Calculate claimable amount based on vault token type
   * @param {Object} vault - Vault model instance with token_type field
   * @param {Object} subSchedule - SubSchedule model instance
   * @param {Date} currentTime - Current timestamp for vesting calculation
   * @param {Array<Object>} allSubSchedules - All subschedules for the vault (required for dynamic)
   * @returns {Promise<string>} The claimable amount as a string
   * @throws {OverflowError} If multiplication overflows
   * @throws {DivisionByZeroError} If division by zero occurs
   */
  async calculateClaimable(vault, subSchedule, currentTime, allSubSchedules = null) {
    // Branch based on token type
    if (vault.token_type === TokenType.DYNAMIC) {
      return await this.calculateDynamic(vault, subSchedule, currentTime, allSubSchedules);
    } else {
      // Default to static calculation
      return this.calculateStatic(subSchedule, currentTime);
    }
  }

  /**
   * Calculate claimable amount using static logic (updated to prevent dust loss)
   * Formula: Total_Vested = (Elapsed_Time * Total_Allocation) / Total_Duration
   * Current_Payout = Total_Vested - Cumulative_Claimed
   * @param {Object} subSchedule - SubSchedule model instance
   * @param {Date} currentTime - Current timestamp for vesting calculation
   * @returns {string} The claimable amount as a string
   */
  calculateStatic(subSchedule, currentTime) {
    // Calculate total vested amount using time-based formula
    const totalVested = this._calculateVestedAmount(subSchedule, currentTime);
    
    // Use cumulative claimed amount instead of amount_withdrawn to prevent dust loss
    const cumulativeClaimed = parseFloat(subSchedule.cumulative_claimed_amount || 0);
    const claimable = totalVested - cumulativeClaimed;
    
    return String(Math.max(0, claimable));
  }

  /**
   * Calculate claimable amount using proportional distribution for dynamic tokens
   * Formula: (user_vested / total_vested) * actual_balance - amount_withdrawn
   * @param {Object} vault - Vault model instance
   * @param {Object} subSchedule - SubSchedule model instance
   * @param {Date} currentTime - Current timestamp for vesting calculation
   * @param {Array<Object>} allSubSchedules - All subschedules for the vault
   * @returns {Promise<string>} The claimable amount as a string
   * @throws {OverflowError} If multiplication overflows
   * @throws {DivisionByZeroError} If division by zero occurs
   */
  async calculateDynamic(vault, subSchedule, currentTime, allSubSchedules) {
    // Get actual balance from SAC
    const actualBalance = await this.balanceTracker.getActualBalance(
      vault.token_address,
      vault.address
    );
    const actualBalanceNum = parseFloat(actualBalance);

    // Calculate total vested across all subschedules
    const totalVested = this.calculateTotalVested(allSubSchedules || [subSchedule], currentTime);

    // Handle division by zero - if nothing has vested yet, return 0
    if (totalVested === 0) {
      return '0';
    }

    // Calculate this user's vested amount
    const userVested = this._calculateVestedAmount(subSchedule, currentTime);

    // Proportional share: (user_vested / total_vested) * actual_balance
    // Using safe arithmetic to prevent overflow
    const proportionalShare = this._safeMultiplyDivide(
      userVested,
      actualBalanceNum,
      totalVested
    );

    // Subtract what user already withdrew using cumulative tracking
    const amountWithdrawn = parseFloat(subSchedule.cumulative_claimed_amount || 0);
    const claimable = proportionalShare - amountWithdrawn;

    // Ensure result is non-negative
    return String(Math.max(0, claimable));
  }

  /**
   * Calculate total vested amount across all subschedules
   * @param {Array<Object>} subSchedules - Array of SubSchedule model instances
   * @param {Date} currentTime - Current timestamp for vesting calculation
   * @returns {number} Total vested amount across all subschedules
   */
  calculateTotalVested(subSchedules, currentTime) {
    return subSchedules.reduce((total, subSchedule) => {
      const vested = this._calculateVestedAmount(subSchedule, currentTime);
      return total + vested;
    }, 0);
  }

  /**
   * Calculate vested amount for a single subschedule
   * Uses the formula: Total_Vested = (Elapsed_Time * Total_Allocation) / Total_Duration
   * @private
   * @param {Object} subSchedule - SubSchedule model instance
   * @param {Date} currentTime - Current timestamp
   * @returns {number} Vested amount
   */
  _calculateVestedAmount(subSchedule, currentTime) {
    const asOfDate = currentTime instanceof Date ? currentTime : new Date(currentTime);
    
    // Check if cliff has passed
    if (subSchedule.cliff_date && asOfDate < subSchedule.cliff_date) {
      return 0;
    }

    // Check if vesting hasn't started
    if (asOfDate < subSchedule.vesting_start_date) {
      return 0;
    }

    // Check if vesting has fully completed
    const vestingEnd = new Date(
      subSchedule.vesting_start_date.getTime() + subSchedule.vesting_duration * 1000
    );
    if (asOfDate >= vestingEnd) {
      return parseFloat(subSchedule.top_up_amount);
    }

    // Calculate vested amount using the new formula: Total_Vested = (Elapsed_Time * Total_Allocation) / Total_Duration
    const elapsedTimeInSeconds = Math.floor((asOfDate - subSchedule.vesting_start_date) / 1000);
    const totalAllocation = parseFloat(subSchedule.top_up_amount);
    const totalDurationInSeconds = subSchedule.vesting_duration;
    
    // Use precise calculation to minimize dust loss
    const totalVested = (elapsedTimeInSeconds * totalAllocation) / totalDurationInSeconds;

    return totalVested;
  }

  /**
   * Safely multiply and divide to prevent overflow
   * Calculates: (a * b) / c
   * @private
   * @param {number} a - First operand
   * @param {number} b - Second operand
   * @param {number} c - Divisor
   * @returns {number} Result of (a * b) / c
   * @throws {OverflowError} If multiplication overflows
   * @throws {DivisionByZeroError} If c is zero
   */
  _safeMultiplyDivide(a, b, c) {
    if (c === 0) {
      throw new DivisionByZeroError(a * b);
    }

    // Check for potential overflow
    // JavaScript numbers are 64-bit floats, but we need to be careful with precision
    const product = a * b;
    
    // Check if the product is finite
    if (!isFinite(product)) {
      throw new OverflowError('multiplication', a, b);
    }

    const result = product / c;

    // Check if the result is finite
    if (!isFinite(result)) {
      throw new OverflowError('division', product, c);
    }

    return result;
  }
}

module.exports = ClaimCalculator;
