const { sequelize } = require('../database/connection');
const { QueryTypes } = require('sequelize');

class CalendarService {
  async getUpcomingUnlocks(userAddress, days = 30) {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    // Fetch all vaults where user is a beneficiary
    const vaults = await sequelize.query(
      `SELECT v.id, v.token_address, v.total_amount, v.created_at,
              b.total_allocated, b.total_withdrawn
       FROM vaults v
       JOIN beneficiaries b ON b.vault_id = v.id
       WHERE b.address = :userAddress`,
      {
        replacements: { userAddress },
        type: QueryTypes.SELECT,
      }
    );

    if (!vaults.length) return [];

    const unlocks = [];

    for (const vault of vaults) {
      const remaining = parseFloat(vault.total_allocated) - parseFloat(vault.total_withdrawn);
      if (remaining <= 0) continue;

      // Simple linear daily unlock projection over 30 days
      const dailyUnlock = remaining / days;

      for (let i = 1; i <= days; i++) {
        const unlockDate = new Date(today);
        unlockDate.setDate(today.getDate() + i);

        unlocks.push({
          date: unlockDate.toISOString().split('T')[0],
          token: vault.token_address,
          amount_unlocking: parseFloat(dailyUnlock.toFixed(6)),
        });
      }
    }

    // Sort by date
    unlocks.sort((a, b) => new Date(a.date) - new Date(b.date));

    return unlocks;
  }
}

module.exports = new CalendarService();
