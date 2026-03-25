const { Vault, TVL } = require('../models');

class TVLService {
  /**
   * Calculate total TVL from all active vaults
   * @returns {Promise<{totalValueLocked: number, activeVaultsCount: number}>}
   */
  async calculateTVL() {
    try {
      const vaults = await Vault.findAll({
        where: { is_active: true }
      });

      let totalValueLocked = 0;
      for (const vault of vaults) {
        totalValueLocked += parseFloat(vault.total_amount || 0);
      }

      return {
        totalValueLocked,
        activeVaultsCount: vaults.length
      };
    } catch (error) {
      console.error('Error calculating TVL:', error);
      throw error;
    }
  }

  /**
   * Update TVL record in database and broadcast via WebSocket
   * @returns {Promise<TVL>} Updated TVL record
   */
  async updateTVL() {
    try {
      const { totalValueLocked, activeVaultsCount } = await this.calculateTVL();

      // Get or create TVL record (there should only be one)
      let tvlRecord = await TVL.findOne();

      if (tvlRecord) {
        await tvlRecord.update({
          total_value_locked: totalValueLocked,
          active_vaults_count: activeVaultsCount,
          last_updated_at: new Date()
        });
      } else {
        tvlRecord = await TVL.create({
          total_value_locked: totalValueLocked,
          active_vaults_count: activeVaultsCount,
          last_updated_at: new Date()
        });
      }

      console.log(`TVL updated: ${totalValueLocked} across ${activeVaultsCount} vaults`);

      // Broadcast TVL update via WebSocket
      await this.broadcastTVLUpdate(tvlRecord);

      return tvlRecord;
    } catch (error) {
      console.error('Error updating TVL:', error);
      throw error;
    }
  }

  /**
   * Get current TVL stats
   * @returns {Promise<Object>} TVL stats
   */
  async getTVLStats() {
    try {
      let tvlRecord = await TVL.findOne();

      // If no record exists, calculate and create one
      if (!tvlRecord) {
        tvlRecord = await this.updateTVL();
      }

      return {
        total_value_locked: parseFloat(tvlRecord.total_value_locked),
        active_vaults_count: tvlRecord.active_vaults_count,
        last_updated_at: tvlRecord.last_updated_at,
        created_at: tvlRecord.created_at
      };
    } catch (error) {
      console.error('Error getting TVL stats:', error);
      throw error;
    }
  }

  /**
   * Handle vault created event - increment TVL
   * @param {Object} vaultData - New vault data
   * @returns {Promise<void>}
   */
  async handleVaultCreated(vaultData) {
    try {
      console.log(`Handling VaultCreated event for vault: ${vaultData.address}`);
      await this.updateTVL();
    } catch (error) {
      console.error('Error handling vault created event:', error);
    }
  }

  /**
   * Handle claim event - decrement TVL by claimed amount
   * @param {Object} claimData - Claim data
   * @returns {Promise<void>}
   */
  async handleClaim(claimData) {
    try {
      console.log(`Handling Claim event for transaction: ${claimData.transaction_hash}`);
      await this.updateTVL();
    } catch (error) {
      console.error('Error handling claim event:', error);
    }
  }

  /**
   * Format TVL value to human-readable string
   * @param {number} tvl - TVL value
   * @returns {string} Formatted TVL string (e.g., "$5M", "$500K")
   */
  formatTVL(tvl) {
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(2)}M`;
    } else if (tvl >= 1000) {
      return `$${(tvl / 1000).toFixed(2)}K`;
    }
    return `$${tvl.toFixed(2)}`;
  }

  /**
   * Broadcast TVL update via WebSocket
   * @param {Object} tvlRecord - TVL database record
   * @returns {Promise<void>}
   */
  async broadcastTVLUpdate(tvlRecord) {
    try {
      // Import here to avoid circular dependency
      const { publishTVLUpdate } = require('../graphql/subscriptions/proofSubscription');
      
      const tvlStats = {
        totalValueLocked: parseFloat(tvlRecord.total_value_locked),
        activeVaultsCount: tvlRecord.active_vaults_count,
        formattedTvl: this.formatTVL(parseFloat(tvlRecord.total_value_locked)),
        lastUpdatedAt: tvlRecord.last_updated_at
      };

      await publishTVLUpdate(tvlStats);
    } catch (error) {
      console.error('Error broadcasting TVL update:', error);
      // Don't throw - broadcast failure shouldn't fail TVL update
    }
  }
}

module.exports = new TVLService();
