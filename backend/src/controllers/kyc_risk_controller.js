// backend/src/controllers/kyc_risk_controller.js
const express = require('express');
const router = express.Router();
const service = require('../services/kyc_risk_service');

router.post('/kyc/evaluate', async (req, res) => {
  try {
    const { profileId, vestingValueUsd, basicChecksPassed } = req.body;
    const result = await service.evaluateKyc(profileId, vestingValueUsd, basicChecksPassed);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
