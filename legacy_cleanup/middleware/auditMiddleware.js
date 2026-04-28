const AuditService = require('../services/AuditService');

class AuditMiddleware {
    constructor() {
        this.auditService = new AuditService();
    }

    auditAction(actionType, getActorId = (req) => req.user?.id || req.ip, getTargetId = null, getOldData = null, getNewData = null) {
        return async (req, res, next) => {
            const originalSend = res.send;
            let responseData = null;
            let capturedError = null;

            res.send = function(data) {
                responseData = data;
                return originalSend.call(this, data);
            };

            const originalJson = res.json;
            res.json = function(data) {
                responseData = data;
                return originalJson.call(this, data);
            };

            res.on('finish', async () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        const actorId = getActorId(req);
                        const targetId = getTargetId ? getTargetId(req, res) : null;
                        const oldData = getOldData ? getOldData(req, res) : null;
                        const newData = getNewData ? getNewData(req, res) : null;

                        const metadata = {
                            method: req.method,
                            url: req.originalUrl,
                            userAgent: req.get('User-Agent'),
                            ip: req.ip,
                            statusCode: res.statusCode,
                            timestamp: new Date().toISOString(),
                            userRole: req.user?.role || 'anonymous',
                            userId: req.user?.id || 'anonymous'
                        };

                        await this.auditService.logAdminAction(
                            actionType,
                            actorId,
                            targetId,
                            oldData,
                            newData,
                            metadata
                        );
                    }
                } catch (error) {
                    console.error('Error in audit middleware:', error);
                }
            }.bind(this));

            next();
        };
    }

    auditVestingChanges() {
        return this.auditAction(
            'VESTING_CHANGE',
            (req) => req.user?.id || req.body.adminId || 'unknown',
            (req) => req.params.beneficiaryId || req.body.beneficiaryId,
            (req) => req.body.previousData,
            (req) => req.body.newData
        );
    }

    auditCliffDateChanges() {
        return this.auditAction(
            'CLIFF_DATE_CHANGE',
            (req) => req.user?.id || req.body.adminId || 'unknown',
            (req) => req.params.beneficiaryId || req.body.beneficiaryId,
            (req) => ({ previousCliffDate: req.body.previousCliffDate }),
            (req) => ({ newCliffDate: req.body.newCliffDate })
        );
    }

    auditBeneficiaryChanges() {
        return this.auditAction(
            'BENEFICIARY_CHANGE',
            (req) => req.user?.id || req.body.adminId || 'unknown',
            (req) => req.params.beneficiaryId || req.body.beneficiaryId,
            (req) => req.body.previousBeneficiaryData,
            (req) => req.body.newBeneficiaryData
        );
    }

    auditAdminActions() {
        return this.auditAction(
            'ADMIN_ACTION',
            (req) => req.user?.id || req.body.adminId || 'unknown',
            (req) => req.params.id || req.body.targetId,
            null,
            (req) => ({ 
                action: req.body.action,
                changes: req.body.changes,
                requestBody: req.body 
            })
        );
    }

    manualAudit(actionType, actorId, targetId = null, oldData = null, newData = null, metadata = null) {
        return async (req, res, next) => {
            try {
                await this.auditService.logAdminAction(
                    actionType,
                    actorId,
                    targetId,
                    oldData,
                    newData,
                    metadata
                );
                
                res.json({ success: true, message: 'Audit log created successfully' });
            } catch (error) {
                console.error('Error in manual audit:', error);
                res.status(500).json({ error: 'Failed to create audit log' });
            }
        };
    }
}

module.exports = new AuditMiddleware();
