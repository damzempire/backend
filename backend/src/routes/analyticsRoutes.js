const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authService = require('../services/authService');

// GET /api/org/:id/analytics/top-claimers
router.get(
  '/org/:id/analytics/top-claimers',
  authService.authenticate(true), // Enforce admin access
  analyticsController.getTopClaimers.bind(analyticsController)
);

module.exports = router;