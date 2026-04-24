// backend/src/controllers/identity_controller.js
const express = require('express');
const router = express.Router();
const service = require('../services/identity_service');

router.post('/identity/link-key', async (req, res) => {
  try {
    const { profileId, publicKey, vestingSchedule } = req.body;
    const result = await service.linkKey(profileId, publicKey, vestingSchedule);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/identity/unlink-key', async (req, res) => {
  try {
    const { profileId, publicKey } = req.body;
    await service.unlinkKey(profileId, publicKey);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/identity/:profileId/keys', async (req, res) => {
  const keys = await service.getKeys(req.params.profileId);
  res.json(keys);
});

router.get('/identity/key/:publicKey/profile', async (req, res) => {
  const profile = await service.getProfile(req.params.publicKey);
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

module.exports = router;
