const Sentry = require('@sentry/node');

// 1. Initialize Sentry with a dummy DSN and debug mode
Sentry.init({
    dsn: 'http://dummy_key@localhost:9999/1',
    debug: true,
    environment: 'local-test',
});

// 2. Mock database requires to prevent hanging on connection attempts
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (request) {
    if (request.includes('../models') || request.includes('./models')) {
        return {
            ClaimsHistory: {}, Vault: {}, SubSchedule: {},
            OrganizationWebhook: {}, sequelize: { Op: {} }
        };
    }
    if (request.includes('./database/connection')) {
        return { sequelize: { authenticate: async () => { }, sync: async () => { } } };
    }
    return originalRequire.apply(this, arguments);
};

// 3. Require the instrumented service
const { instance: indexingService } = require('./src/services/indexingService');

async function testSentry() {
    console.log('\n=============================================');
    console.log('🚀 Triggering indexingService error... ');
    console.log('=============================================\n');

    try {
        // Calling processClaim with null forces a destructuring TypeError
        await indexingService.processClaim(null);
    } catch (error) {
        console.log('\n=============================================');
        console.log('🛑 Error locally caught. Watch Sentry debug logs:');
        console.log('=============================================\n');

        // Allow Sentry background queues to flush its debug logs
        setTimeout(() => {
            console.log('✅ Test complete.');
            process.exit(0);
        }, 2000);
    }
}

testSentry();
