'use strict';

const { GrantStream, DAOProposal } = require('../models');
const { sequelize } = require('../database/connection');
const { Op } = require('sequelize');

class SuccessionService {
  /**
   * Nominate a backup wallet for a grant project.
   */
  async nominateBackup(grantId, backupWallet, requesterAddress) {
    const grant = await GrantStream.findByPk(grantId);
    if (!grant) throw new Error(`Grant project ${grantId} not found`);

    // Only current owner can nominate backup
    if (grant.owner_address !== requesterAddress) {
      throw new Error('Only the primary wallet owner can nominate a backup');
    }

    await grant.update({
      backup_wallet: backupWallet,
      last_active_at: new Date(), // Update activity too
    });

    return { success: true, grantId, backupWallet };
  }

  /**
   * Check for inactive grants and trigger succession votes if necessary.
   * This should be called by a cron job or background worker.
   */
  async checkInactiveGrants() {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const inactiveGrants = await GrantStream.findAll({
      where: {
        last_active_at: { [Op.lt]: sixtyDaysAgo },
        is_active: true,
        backup_wallet: { [Op.ne]: null } // Only if a backup is nominated
      }
    });

    const triggeredVotes = [];

    for (const grant of inactiveGrants) {
      // Check if a succession proposal already exists
      const existingProposal = await DAOProposal.findOne({
        where: {
          project_id: grant.id,
          title: { [Op.like]: 'Succession: %' },
          status: 'active'
        }
      });

      if (!existingProposal) {
        // Trigger DAO vote to transfer stream to backup
        const proposal = await DAOProposal.create({
          project_id: grant.id,
          title: `Succession: Transfer stream for ${grant.name} to backup`,
          status: 'active',
          metadata: {
            reason: 'Primary wallet inactive for 60+ days',
            backup_wallet: grant.backup_wallet
          }
        });
        triggeredVotes.push(proposal);
      }
    }

    return triggeredVotes;
  }

  /**
   * Finalize the succession after a successful DAO vote.
   */
  async finalizeSuccession(proposalId) {
    const proposal = await DAOProposal.findByPk(proposalId);
    if (!proposal || !proposal.title.startsWith('Succession:')) {
       throw new Error(`Invalid or not found succession proposal: ${proposalId}`);
    }

    if (proposal.status !== 'completed' || !proposal.outcome_success) {
        throw new Error(`Proposal ${proposalId} did not pass or is not completed`);
    }

    const grant = await GrantStream.findByPk(proposal.project_id);
    const newOwner = grant.backup_wallet;

    await grant.update({
      owner_address: newOwner,
      backup_wallet: null, // Clear backup for now or keep it?
      last_active_at: new Date()
    });

    return { success: true, grantId: grant.id, newOwner };
  }
}

module.exports = new SuccessionService();
