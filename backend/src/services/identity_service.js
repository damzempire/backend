// backend/src/services/identity_service.js
const db = require('../db'); // assume db client wrapper

async function linkKey(profileId, publicKey, vestingSchedule) {
  const profile = await db.query('SELECT verification_status FROM kyc_profiles WHERE profile_id=$1', [profileId]);
  if (!profile.rows.length || profile.rows[0].verification_status !== 'verified') {
    throw new Error('Profile not verified');
  }
  await db.query(
    'INSERT INTO stellar_keys (key_id, profile_id, public_key, vesting_schedule) VALUES (gen_random_uuid(), $1, $2, $3)',
    [profileId, publicKey, vestingSchedule]
  );
  return { profileId, publicKey };
}

async function unlinkKey(profileId, publicKey) {
  await db.query('DELETE FROM stellar_keys WHERE profile_id=$1 AND public_key=$2', [profileId, publicKey]);
}

async function getKeys(profileId) {
  const res = await db.query('SELECT public_key, vesting_schedule FROM stellar_keys WHERE profile_id=$1', [profileId]);
  return res.rows;
}

async function getProfile(publicKey) {
  const res = await db.query(
    'SELECT k.* FROM kyc_profiles k JOIN stellar_keys s ON k.profile_id=s.profile_id WHERE s.public_key=$1',
    [publicKey]
  );
  return res.rows[0];
}

module.exports = { linkKey, unlinkKey, getKeys, getProfile };
