const DatabaseFailoverManager = require('./database-failover');

// Mock environment variables for testing
process.env.DB_PRIMARY_HOST = 'localhost';
process.env.DB_PRIMARY_PORT = '5432';
process.env.DB_PRIMARY_NAME = 'test_vesting';
process.env.DB_PRIMARY_USER = 'postgres';
process.env.DB_PRIMARY_PASSWORD = 'test';

process.env.DB_SECONDARY_HOST = 'localhost';
process.env.DB_SECONDARY_PORT = '3306';
process.env.DB_SECONDARY_NAME = 'test_vesting_backup';
process.env.DB_SECONDARY_USER = 'root';
process.env.DB_SECONDARY_PASSWORD = 'test';
process.env.DB_SECONDARY_TYPE = 'mysql';

class FailoverTest {
    constructor() {
        this.testResults = [];
    }

    log(test, result, message = '') {
        this.testResults.push({
            test,
            result: result ? 'PASS' : 'FAIL',
            message,
            timestamp: new Date().toISOString()
        });
        console.log(`${result ? '✅' : '❌'} ${test}: ${message}`);
    }

    async testInitialization() {
        try {
            const manager = new DatabaseFailoverManager();
            const status = manager.getStatus();
            
            this.log(
                'Database Failover Initialization',
                status && status.currentDB === 'primary',
                `Current DB: ${status?.currentDB}, Read-only: ${status?.isReadOnly}`
            );
            
            await manager.close();
        } catch (error) {
            this.log('Database Failover Initialization', false, error.message);
        }
    }

    async testHeartbeatMechanism() {
        try {
            const manager = new DatabaseFailoverManager();
            
            // Wait a few seconds to let heartbeat run
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            const status = manager.getStatus();
            this.log(
                'Heartbeat Mechanism',
                status && status.lastHeartbeat > 0,
                `Last heartbeat: ${new Date(status.lastHeartbeat).toISOString()}`
            );
            
            await manager.close();
        } catch (error) {
            this.log('Heartbeat Mechanism', false, error.message);
        }
    }

    async testReadOnlyMode() {
        try {
            const manager = new DatabaseFailoverManager();
            
            // Simulate failover by forcing read-only mode
            manager.currentDB = 'secondary';
            manager.isReadOnly = true;
            
            try {
                await manager.writeQuery('SELECT 1');
                this.log('Read-Only Mode', false, 'Write query should have failed in read-only mode');
            } catch (error) {
                this.log(
                    'Read-Only Mode',
                    error.message.includes('read-only mode'),
                    'Correctly blocked write operations in read-only mode'
                );
            }
            
            // Test read operations still work
            try {
                await manager.query('SELECT 1');
                this.log('Read Operations in Read-Only', true, 'Read operations work in read-only mode');
            } catch (error) {
                this.log('Read Operations in Read-Only', false, error.message);
            }
            
            await manager.close();
        } catch (error) {
            this.log('Read-Only Mode', false, error.message);
        }
    }

    async testStatusEndpoint() {
        try {
            const response = await fetch('http://localhost:3000/api/health');
            const health = await response.json();
            
            this.log(
                'Health Check Endpoint',
                health.status && health.database,
                `Status: ${health.status}, DB: ${health.database.currentDB}`
            );
        } catch (error) {
            this.log('Health Check Endpoint', false, error.message);
        }
    }

    async testPortfolioEndpoint() {
        try {
            const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
            const response = await fetch(`http://localhost:3000/api/user/${testAddress}/portfolio`);
            const portfolio = await response.json();
            
            this.log(
                'Portfolio Endpoint',
                portfolio.total_locked !== undefined && portfolio.total_claimable !== undefined,
                `Locked: ${portfolio.total_locked}, Claimable: ${portfolio.total_claimable}`
            );
        } catch (error) {
            this.log('Portfolio Endpoint', false, error.message);
        }
    }

    async testFailoverTimeout() {
        try {
            const manager = new DatabaseFailoverManager();
            
            // Simulate primary database being down for more than 30 seconds
            manager.lastHeartbeat = Date.now() - 35000; // 35 seconds ago
            
            // Trigger health check
            await manager.checkPrimaryHealth();
            
            const status = manager.getStatus();
            this.log(
                'Failover Timeout',
                status.currentDB === 'secondary' && status.isReadOnly,
                `Failed over to secondary: ${status.currentDB}, Read-only: ${status.isReadOnly}`
            );
            
            await manager.close();
        } catch (error) {
            this.log('Failover Timeout', false, error.message);
        }
    }

    async runAllTests() {
        console.log('🧪 Starting Multi-Cloud Database Failover Tests\n');
        
        await this.testInitialization();
        await this.testHeartbeatMechanism();
        await this.testReadOnlyMode();
        await this.testFailoverTimeout();
        
        // Server-dependent tests (only if server is running)
        console.log('\n📡 Testing API Endpoints (server must be running on port 3000)...');
        try {
            await this.testStatusEndpoint();
            await this.testPortfolioEndpoint();
        } catch (error) {
            console.log('⚠️ API endpoint tests skipped - server not running');
        }
        
        this.printResults();
    }

    printResults() {
        console.log('\n📊 Test Results:');
        console.log('=' .repeat(50));
        
        const passed = this.testResults.filter(r => r.result === 'PASS').length;
        const total = this.testResults.length;
        
        this.testResults.forEach(result => {
            console.log(`${result.result} ${result.test}`);
            if (result.message) {
                console.log(`   ${result.message}`);
            }
        });
        
        console.log('=' .repeat(50));
        console.log(`Summary: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! Multi-cloud failover system is working correctly.');
        } else {
            console.log('⚠️ Some tests failed. Please check the configuration and setup.');
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new FailoverTest();
    tester.runAllTests().catch(console.error);
}

module.exports = FailoverTest;
