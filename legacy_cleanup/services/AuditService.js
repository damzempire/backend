const AuditLog = require('../models/AuditLog');
const StellarService = require('./StellarService');
const cron = require('node-cron');

class AuditService {
    constructor() {
        this.auditLog = new AuditLog();
        this.stellarService = new StellarService();
        this.initDailyAnchoring();
    }

    initDailyAnchoring() {
        cron.schedule('0 2 * * *', async () => {
            console.log('Running daily audit log anchoring job...');
            await this.anchorDailyLogs();
        });
        
        console.log('Daily audit anchoring scheduled for 2:00 AM UTC');
    }

    async logAdminAction(actionType, actorId, targetId = null, oldData = null, newData = null, metadata = null) {
        try {
            const result = await this.auditLog.createLogEntry(
                actionType,
                actorId,
                targetId,
                oldData,
                newData,
                metadata
            );

            console.log(`Audit log created: ${result.id} with hash: ${result.hash}`);
            return result;

        } catch (error) {
            console.error('Error creating audit log:', error);
            throw error;
        }
    }

    async anchorDailyLogs(date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            console.log(`Calculating root hash for ${targetDate}`);
            
            const dailyHashResult = await this.auditLog.calculateDailyRootHash(targetDate);
            
            if (!dailyHashResult) {
                console.log(`No audit logs found for ${targetDate}`);
                return { success: false, message: 'No logs to anchor' };
            }

            const existingHash = await this.auditLog.getDailyHash(targetDate);
            if (existingHash && existingHash.stellar_transaction_id) {
                console.log(`Logs for ${targetDate} already anchored with transaction: ${existingHash.stellar_transaction_id}`);
                return { 
                    success: true, 
                    alreadyAnchored: true,
                    transactionId: existingHash.stellar_transaction_id,
                    rootHash: existingHash.root_hash
                };
            }

            console.log(`Anchoring root hash: ${dailyHashResult.rootHash}`);
            
            const anchorResult = await this.stellarService.anchorRootHash(
                dailyHashResult.rootHash,
                targetDate
            );

            if (anchorResult.success) {
                await this.auditLog.saveDailyHash(
                    targetDate,
                    dailyHashResult.rootHash,
                    anchorResult.transactionId
                );

                console.log(`Successfully anchored ${dailyHashResult.logCount} logs for ${targetDate}`);
                console.log(`Transaction ID: ${anchorResult.transactionId}`);
                
                return {
                    success: true,
                    transactionId: anchorResult.transactionId,
                    rootHash: dailyHashResult.rootHash,
                    logCount: dailyHashResult.logCount,
                    date: targetDate,
                    message: anchorResult.message
                };
            } else {
                console.error('Failed to anchor root hash:', anchorResult.error);
                return {
                    success: false,
                    error: anchorResult.error,
                    message: anchorResult.message
                };
            }

        } catch (error) {
            console.error('Error in daily anchoring process:', error);
            return {
                success: false,
                error: error.message,
                message: 'Daily anchoring process failed'
            };
        }
    }

    async verifyAuditTrail(startDate = null, endDate = null) {
        try {
            const chainIntegrity = await this.auditLog.verifyChainIntegrity();
            
            if (!chainIntegrity.valid) {
                return {
                    valid: false,
                    chainIntegrity,
                    message: 'Audit trail chain integrity compromised'
                };
            }

            let verificationResults = {
                chainIntegrity,
                dailyAnchors: [],
                overallValid: true
            };

            if (startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
                    const dateStr = date.toISOString().split('T')[0];
                    const dailyHash = await this.auditLog.getDailyHash(dateStr);
                    
                    if (dailyHash && dailyHash.stellar_transaction_id) {
                        const stellarVerification = await this.stellarService.verifyAnchoredTransaction(
                            dailyHash.stellar_transaction_id,
                            dailyHash.root_hash,
                            dateStr
                        );
                        
                        verificationResults.dailyAnchors.push({
                            date: dateStr,
                            rootHash: dailyHash.root_hash,
                            transactionId: dailyHash.stellar_transaction_id,
                            verified: stellarVerification.verified,
                            message: stellarVerification.message
                        });

                        if (!stellarVerification.verified) {
                            verificationResults.overallValid = false;
                        }
                    }
                }
            }

            return {
                valid: verificationResults.overallValid,
                ...verificationResults,
                message: verificationResults.overallValid 
                    ? 'Audit trail fully verified and immutable' 
                    : 'Audit trail verification failed'
            };

        } catch (error) {
            console.error('Error verifying audit trail:', error);
            return {
                valid: false,
                error: error.message,
                message: 'Audit trail verification failed'
            };
        }
    }

    async getAuditHistory(filters = {}) {
        try {
            const { startDate, endDate, actionType, actorId, limit = 100 } = filters;
            
            let whereClause = '1=1';
            let params = [];

            if (startDate) {
                whereClause += ' AND timestamp >= ?';
                params.push(startDate);
            }

            if (endDate) {
                whereClause += ' AND timestamp <= ?';
                params.push(endDate);
            }

            if (actionType) {
                whereClause += ' AND action_type = ?';
                params.push(actionType);
            }

            if (actorId) {
                whereClause += ' AND actor_id = ?';
                params.push(actorId);
            }

            return new Promise((resolve, reject) => {
                this.auditLog.db.all(
                    `SELECT * FROM audit_logs 
                    WHERE ${whereClause} 
                    ORDER BY timestamp DESC 
                    LIMIT ?`,
                    [...params, limit],
                    (err, rows) => {
                        if (err) {
                            reject(err);
                        } else {
                            const logs = rows.map(row => ({
                                ...row,
                                old_data: row.old_data ? JSON.parse(row.old_data) : null,
                                new_data: row.new_data ? JSON.parse(row.new_data) : null,
                                metadata: row.metadata ? JSON.parse(row.metadata) : null
                            }));
                            resolve(logs);
                        }
                    }
                );
            });

        } catch (error) {
            console.error('Error retrieving audit history:', error);
            throw error;
        }
    }

    async getStellarAccountInfo() {
        return await this.stellarService.getAccountInfo();
    }
}

module.exports = AuditService;
