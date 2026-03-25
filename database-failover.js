const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

class DatabaseFailoverManager {
    constructor() {
        this.primaryDB = null;
        this.secondaryDB = null;
        this.currentDB = 'primary';
        this.isReadOnly = false;
        this.lastHeartbeat = Date.now();
        this.heartbeatInterval = null;
        this.failoverTimeout = 30000; // 30 seconds
        
        this.initializeConnections();
        this.startHeartbeat();
    }

    initializeConnections() {
        // Primary database (AWS PostgreSQL)
        this.primaryDB = new Pool({
            host: process.env.DB_PRIMARY_HOST || 'localhost',
            port: process.env.DB_PRIMARY_PORT || 5432,
            database: process.env.DB_PRIMARY_NAME || 'vesting_vault',
            user: process.env.DB_PRIMARY_USER || 'postgres',
            password: process.env.DB_PRIMARY_PASSWORD || '',
            ssl: process.env.DB_PRIMARY_SSL === 'true' ? { rejectUnauthorized: false } : false,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Secondary database (Google Cloud MySQL or DigitalOcean)
        const secondaryConfig = {
            host: process.env.DB_SECONDARY_HOST || 'localhost',
            port: process.env.DB_SECONDARY_PORT || 3306,
            database: process.env.DB_SECONDARY_NAME || 'vesting_vault_backup',
            user: process.env.DB_SECONDARY_USER || 'root',
            password: process.env.DB_SECONDARY_PASSWORD || '',
            ssl: process.env.DB_SECONDARY_SSL === 'true' ? { rejectUnauthorized: false } : false,
            connectionLimit: 20,
            acquireTimeout: 2000,
            timeout: 30000,
        };

        if (process.env.DB_SECONDARY_TYPE === 'mysql') {
            this.secondaryDB = mysql.createPool(secondaryConfig);
        } else {
            // Fallback to PostgreSQL for secondary
            this.secondaryDB = new Pool(secondaryConfig);
        }
    }

    async startHeartbeat() {
        // Run heartbeat every 10 seconds
        cron.schedule('*/10 * * * * *', async () => {
            await this.checkPrimaryHealth();
        });

        // Initial health check
        await this.checkPrimaryHealth();
    }

    async checkPrimaryHealth() {
        try {
            const start = Date.now();
            await this.primaryDB.query('SELECT 1');
            const responseTime = Date.now() - start;
            
            this.lastHeartbeat = Date.now();
            
            // Log successful heartbeat
            console.log(`✅ Primary DB heartbeat successful (${responseTime}ms)`);
            
            // If we were in failover mode, try to switch back
            if (this.currentDB === 'secondary') {
                console.log('🔄 Primary DB recovered, switching back...');
                await this.switchToPrimary();
            }
            
        } catch (error) {
            console.error('❌ Primary DB heartbeat failed:', error.message);
            
            // Check if failover timeout has been exceeded
            const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
            if (timeSinceLastHeartbeat > this.failoverTimeout) {
                console.log('⚠️ Primary DB timeout exceeded, initiating failover...');
                await this.initiateFailover();
            }
        }
    }

    async initiateFailover() {
        if (this.currentDB === 'primary') {
            try {
                console.log('🔄 Switching to secondary database...');
                this.currentDB = 'secondary';
                this.isReadOnly = true;
                
                // Test secondary connection
                if (process.env.DB_SECONDARY_TYPE === 'mysql') {
                    await this.secondaryDB.query('SELECT 1');
                } else {
                    await this.secondaryDB.query('SELECT 1');
                }
                
                console.log('✅ Successfully failed over to secondary database (READ-ONLY mode)');
            } catch (error) {
                console.error('❌ Secondary database also unavailable:', error.message);
                throw new Error('Both primary and secondary databases are unavailable');
            }
        }
    }

    async switchToPrimary() {
        try {
            // Test primary connection before switching
            await this.primaryDB.query('SELECT 1');
            
            this.currentDB = 'primary';
            this.isReadOnly = false;
            console.log('✅ Successfully switched back to primary database (READ-WRITE mode)');
        } catch (error) {
            console.error('❌ Failed to switch back to primary:', error.message);
        }
    }

    async query(sql, params = []) {
        const db = this.currentDB === 'primary' ? this.primaryDB : this.secondaryDB;
        
        try {
            if (this.currentDB === 'primary') {
                const result = await db.query(sql, params);
                return result.rows || result;
            } else {
                // MySQL or PostgreSQL secondary
                if (process.env.DB_SECONDARY_TYPE === 'mysql') {
                    const [rows] = await db.query(sql, params);
                    return rows;
                } else {
                    const result = await db.query(sql, params);
                    return result.rows || result;
                }
            }
        } catch (error) {
            console.error(`Database query failed on ${this.currentDB}:`, error.message);
            
            // If primary fails during query, trigger failover
            if (this.currentDB === 'primary') {
                await this.initiateFailover();
                // Retry query on secondary
                return this.query(sql, params);
            }
            
            throw error;
        }
    }

    async writeQuery(sql, params = []) {
        if (this.isReadOnly) {
            throw new Error('Database is in read-only mode during failover');
        }
        
        return this.query(sql, params);
    }

    getStatus() {
        return {
            currentDB: this.currentDB,
            isReadOnly: this.isReadOnly,
            lastHeartbeat: this.lastHeartbeat,
            uptime: Date.now() - this.lastHeartbeat
        };
    }

    async close() {
        if (this.primaryDB) await this.primaryDB.end();
        if (this.secondaryDB) await this.secondaryDB.end();
    }
}

module.exports = DatabaseFailoverManager;
