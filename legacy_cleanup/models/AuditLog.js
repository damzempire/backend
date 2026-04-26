const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const path = require('path');

class AuditLog {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../data/audit.db'));
        this.initDatabase();
    }

    initDatabase() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    action_type TEXT NOT NULL,
                    actor_id TEXT NOT NULL,
                    target_id TEXT,
                    old_data TEXT,
                    new_data TEXT,
                    hash TEXT NOT NULL,
                    previous_hash TEXT,
                    nonce TEXT NOT NULL,
                    metadata TEXT
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS daily_hashes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE UNIQUE NOT NULL,
                    root_hash TEXT NOT NULL,
                    stellar_transaction_id TEXT,
                    anchored_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            this.db.run(`
                CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
            `);

            this.db.run(`
                CREATE INDEX IF NOT EXISTS idx_audit_action_type ON audit_logs(action_type);
            `);
        });
    }

    generateHash(data, previousHash = null) {
        const nonce = crypto.randomBytes(16).toString('hex');
        const hashData = {
            ...data,
            previousHash,
            nonce,
            timestamp: new Date().toISOString()
        };
        
        const hashString = JSON.stringify(hashData, Object.keys(hashData).sort());
        const hash = crypto.createHash('sha256').update(hashString).digest('hex');
        
        return { hash, nonce };
    }

    async createLogEntry(actionType, actorId, targetId = null, oldData = null, newData = null, metadata = null) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT hash FROM audit_logs ORDER BY id DESC LIMIT 1',
                [],
                (err, row) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const previousHash = row ? row.hash : null;
                    const entryData = {
                        actionType,
                        actorId,
                        targetId,
                        oldData,
                        newData,
                        metadata
                    };

                    const { hash, nonce } = this.generateHash(entryData, previousHash);

                    this.db.run(
                        `INSERT INTO audit_logs 
                        (action_type, actor_id, target_id, old_data, new_data, hash, previous_hash, nonce, metadata)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            actionType,
                            actorId,
                            targetId,
                            oldData ? JSON.stringify(oldData) : null,
                            newData ? JSON.stringify(newData) : null,
                            hash,
                            previousHash,
                            nonce,
                            metadata ? JSON.stringify(metadata) : null
                        ],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve({ id: this.lastID, hash, previousHash });
                            }
                        }
                    );
                }
            );
        });
    }

    async getLogsByDateRange(startDate, endDate) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT * FROM audit_logs 
                WHERE timestamp BETWEEN ? AND ? 
                ORDER BY timestamp ASC`,
                [startDate, endDate],
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
    }

    async verifyChainIntegrity(logId = null) {
        return new Promise((resolve, reject) => {
            const query = logId 
                ? 'SELECT * FROM audit_logs WHERE id <= ? ORDER BY id ASC'
                : 'SELECT * FROM audit_logs ORDER BY id ASC';
            
            const params = logId ? [logId] : [];

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (rows.length === 0) {
                    resolve({ valid: true, message: 'No logs to verify' });
                    return;
                }

                let isValid = true;
                let breakPoint = null;

                for (let i = 0; i < rows.length; i++) {
                    const currentLog = rows[i];
                    
                    if (i === 0) {
                        if (currentLog.previous_hash !== null) {
                            isValid = false;
                            breakPoint = currentLog.id;
                            break;
                        }
                    } else {
                        const previousLog = rows[i - 1];
                        if (currentLog.previous_hash !== previousLog.hash) {
                            isValid = false;
                            breakPoint = currentLog.id;
                            break;
                        }
                    }

                    const entryData = {
                        actionType: currentLog.action_type,
                        actorId: currentLog.actor_id,
                        targetId: currentLog.target_id,
                        oldData: currentLog.old_data ? JSON.parse(currentLog.old_data) : null,
                        newData: currentLog.new_data ? JSON.parse(currentLog.new_data) : null,
                        metadata: currentLog.metadata ? JSON.parse(currentLog.metadata) : null
                    };

                    const { hash } = this.generateHash(entryData, currentLog.previous_hash);
                    if (hash !== currentLog.hash) {
                        isValid = false;
                        breakPoint = currentLog.id;
                        break;
                    }
                }

                resolve({
                    valid: isValid,
                    breakPoint,
                    totalLogs: rows.length,
                    message: isValid ? 'Chain integrity verified' : `Chain broken at log ID ${breakPoint}`
                });
            });
        });
    }

    async calculateDailyRootHash(date) {
        return new Promise((resolve, reject) => {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);

            this.getLogsByDateRange(startDate.toISOString(), endDate.toISOString())
                .then(logs => {
                    if (logs.length === 0) {
                        resolve(null);
                        return;
                    }

                    let currentHash = null;
                    for (const log of logs) {
                        currentHash = log.hash;
                    }

                    const rootData = {
                        date,
                        logCount: logs.length,
                        finalHash: currentHash,
                        calculatedAt: new Date().toISOString()
                    };

                    const rootHash = crypto.createHash('sha256')
                        .update(JSON.stringify(rootData, Object.keys(rootData).sort()))
                        .digest('hex');

                    resolve({ rootHash, logCount: logs.length, finalHash: currentHash });
                })
                .catch(reject);
        });
    }

    async saveDailyHash(date, rootHash, stellarTxId = null) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO daily_hashes 
                (date, root_hash, stellar_transaction_id, anchored_at)
                VALUES (?, ?, ?, ?)`,
                [date, rootHash, stellarTxId, stellarTxId ? new Date().toISOString() : null],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ id: this.lastID, date, rootHash });
                    }
                }
            );
        });
    }

    async getDailyHash(date) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM daily_hashes WHERE date = ?',
                [date],
                (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = AuditLog;
