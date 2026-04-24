const express = require('express');
const AuditService = require('../services/AuditService');
const auditMiddleware = require('../middleware/auditMiddleware');

const router = express.Router();
const auditService = new AuditService();

router.get('/verify', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const result = await auditService.verifyAuditTrail(startDate, endDate);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error verifying audit trail:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to verify audit trail'
        });
    }
});

router.get('/history', async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            actionType: req.query.actionType,
            actorId: req.query.actorId,
            limit: parseInt(req.query.limit) || 100
        };

        const logs = await auditService.getAuditHistory(filters);
        
        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        console.error('Error retrieving audit history:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve audit history'
        });
    }
});

router.post('/anchor', async (req, res) => {
    try {
        const { date } = req.body;
        const result = await auditService.anchorDailyLogs(date);
        
        res.json({
            success: result.success,
            ...result
        });
    } catch (error) {
        console.error('Error anchoring daily logs:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to anchor daily logs'
        });
    }
});

router.get('/stellar/account', async (req, res) => {
    try {
        const accountInfo = await auditService.getStellarAccountInfo();
        
        res.json({
            success: true,
            data: accountInfo
        });
    } catch (error) {
        console.error('Error getting Stellar account info:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to get Stellar account information'
        });
    }
});

router.post('/manual', auditMiddleware.manualAudit(
    'MANUAL_AUDIT',
    (req) => req.body.actorId || req.ip,
    (req) => req.body.targetId,
    (req) => req.body.oldData,
    (req) => req.body.newData,
    (req) => req.body.metadata
));

router.get('/chain-integrity', async (req, res) => {
    try {
        const { logId } = req.query;
        const result = await auditService.auditLog.verifyChainIntegrity(logId ? parseInt(logId) : null);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Error checking chain integrity:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to check chain integrity'
        });
    }
});

router.get('/daily-hashes', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        let query = 'SELECT * FROM daily_hashes';
        let params = [];
        
        if (startDate || endDate) {
            query += ' WHERE';
            const conditions = [];
            
            if (startDate) {
                conditions.push(' date >= ?');
                params.push(startDate);
            }
            
            if (endDate) {
                conditions.push(' date <= ?');
                params.push(endDate);
            }
            
            query += conditions.join(' AND');
        }
        
        query += ' ORDER BY date DESC';
        
        auditService.auditLog.db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Error retrieving daily hashes:', err);
                res.status(500).json({
                    success: false,
                    error: err.message,
                    message: 'Failed to retrieve daily hashes'
                });
            } else {
                res.json({
                    success: true,
                    data: rows,
                    count: rows.length
                });
            }
        });
    } catch (error) {
        console.error('Error in daily hashes endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to retrieve daily hashes'
        });
    }
});

module.exports = router;
