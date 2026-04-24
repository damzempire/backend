// backend/src/services/kyc_risk_service.js
const db = require('../db');

const AUTO_APPROVAL_THRESHOLD = 1000; // USD

async function evaluateKyc(profileId, vestingValueUsd, basicChecksPassed) {
  if (!basicChecksPassed) {
    return { status: 'REVIEW', reason: 'Basic checks failed' };
  }

  if (vestingValueUsd < AUTO_APPROVAL_THRESHOLD) {
    // Auto-approve
    await db.query(
      'UPDATE kyc_profiles SET verification_status=$1 WHERE profile_id=$2',
      ['ACCEPTED', profileId]
    );
    return { status: 'ACCEPTED', reason: 'Low-tier auto-approval' };
  } else {
    // Flag for manual review
    await db.query(
      'UPDATE kyc_profiles SET verification_status=$1 WHERE profile_id=$2',
      ['PENDING_REVIEW', profileId]
    );
    return { status: 'PENDING_REVIEW', reason: 'High-tier requires manual review' };
  }
}

module.exports = { evaluateKyc };
