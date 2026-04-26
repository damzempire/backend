// backend/src/services/kyc_service.js
const db = require('../db');

async function updateCustomerStatus(applicantId, status) {
  await db.query(
    'UPDATE kyc_profiles SET verification_status=$1 WHERE profile_id=$2',
    [status, applicantId]
  );
}

module.exports = { updateCustomerStatus };
