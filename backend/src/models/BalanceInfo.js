/**
 * BalanceInfo - Response structure for balance queries
 * 
 * This class represents the balance information for a vault,
 * including both tracked (internal accounting) and actual (SAC) balances.
 */

class BalanceInfo {
  /**
   * Create a BalanceInfo instance
   * @param {string|number} trackedBalance - Internal accounting balance (total_amount)
   * @param {string|number} actualBalance - Real SAC token balance
   * @param {string} tokenType - Token type ('static' or 'dynamic')
   * @param {Array<Object>} distributionRatios - Optional distribution ratios for dynamic vaults
   */
  constructor(trackedBalance, actualBalance, tokenType, distributionRatios = null) {
    this.trackedBalance = String(trackedBalance);
    this.actualBalance = String(actualBalance);
    this.balanceDelta = this.calculateDelta(trackedBalance, actualBalance);
    this.tokenType = tokenType;
    
    // Only include distribution ratios for dynamic tokens
    if (tokenType === 'dynamic' && distributionRatios) {
      this.distributionRatios = distributionRatios;
    }
  }

  /**
   * Calculate the difference between actual and tracked balance
   * @param {string|number} tracked - Tracked balance
   * @param {string|number} actual - Actual balance
   * @returns {string} The delta (actual - tracked)
   */
  calculateDelta(tracked, actual) {
    const trackedNum = typeof tracked === 'string' ? parseFloat(tracked) : tracked;
    const actualNum = typeof actual === 'string' ? parseFloat(actual) : actual;
    return String(actualNum - trackedNum);
  }

  /**
   * Convert to JSON for API responses
   * @returns {Object} JSON representation
   */
  toJSON() {
    const result = {
      tracked_balance: this.trackedBalance,
      actual_balance: this.actualBalance,
      balance_delta: this.balanceDelta,
      token_type: this.tokenType
    };

    if (this.distributionRatios) {
      result.distribution_ratios = this.distributionRatios;
    }

    return result;
  }

  /**
   * Create BalanceInfo from vault data
   * @param {Object} vault - Vault model instance
   * @param {string|number} actualBalance - Actual SAC balance
   * @param {Array<Object>} distributionRatios - Optional distribution ratios
   * @returns {BalanceInfo} New BalanceInfo instance
   */
  static fromVault(vault, actualBalance, distributionRatios = null) {
    return new BalanceInfo(
      vault.total_amount,
      actualBalance,
      vault.token_type,
      distributionRatios
    );
  }
}

module.exports = BalanceInfo;
