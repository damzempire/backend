const { defineConfig } = require('cypress');
const axios = require('axios');
const { execSync, exec } = require('child_process');
const path = require('path');

module.exports = defineConfig({
  e2e: {
    // Base URL of the backend API under test
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:4000',

    // All E2E specs live here
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',

    // Support file loaded before every spec
    supportFile: 'cypress/support/e2e.js',

    // Screenshots and videos on failure
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    video: true,
    screenshotOnRunFailure: true,

    // Timeouts (ms)
    defaultCommandTimeout: 15000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    pageLoadTimeout: 30000,

    // Retry failed tests in CI
    retries: {
      runMode: 2,   // CI: retry up to 2 times
      openMode: 0,  // Interactive: no retries
    },

    // Reporter
    reporter: 'junit',
    reporterOptions: {
      mochaFile: 'cypress/results/e2e-[hash].xml',
      toConsole: true,
    },

    // Environment variables available inside tests via Cypress.env()
    env: {
      API_BASE_URL: process.env.CYPRESS_BASE_URL || 'http://localhost:4000',
      STELLAR_RPC_URL: process.env.STELLAR_RPC_URL || 'http://localhost:8000/rpc',
      STELLAR_HORIZON_URL: process.env.STELLAR_HORIZON_URL || 'http://localhost:8000',
      STELLAR_NETWORK_PASSPHRASE: process.env.STELLAR_NETWORK_PASSPHRASE || 'Standalone Network ; February 2017',
      // Test wallet addresses (funded via Quickstart friendbot in setup)
      ADMIN_ADDRESS: process.env.TEST_ADMIN_ADDRESS || 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
      ADMIN_SECRET: process.env.TEST_ADMIN_SECRET || 'SB3KJLX6RBUKWBSMJKYJQYXJH65VJZIKQSXQK6K5CGFBZQJDNIPWVML',
      BENEFICIARY_ADDRESS: process.env.TEST_BENEFICIARY_ADDRESS || 'GBXGQJWVLWOYHFLZTKAQGE3GYKI1KNNBNSFZL2LT9KCD4NZNEFX7Y6Z',
      BENEFICIARY_SECRET: process.env.TEST_BENEFICIARY_SECRET || 'SCF6JXTVGR2MVYIKPJK3QOHHTYSVR4V7XJNMR3WNKUFLZZ2T5A2C5WD',
    },

    setupNodeEvents(on, config) {
      // ── Stellar Quickstart health task ──────────────────────────────────
      on('task', {
        /**
         * Wait for the Stellar Quickstart container to become healthy.
         * Polls the Horizon root endpoint until it responds or times out.
         */
        async waitForStellar({ horizonUrl, maxWaitMs = 120000 }) {
          const started = Date.now();
          const url = `${horizonUrl}`;
          console.log(`[E2E] Waiting for Stellar Quickstart at ${url}…`);

          while (Date.now() - started < maxWaitMs) {
            try {
              const res = await axios.get(url, { timeout: 5000 });
              if (res.status === 200) {
                console.log('[E2E] Stellar Quickstart is ready.');
                return { ready: true, elapsed: Date.now() - started };
              }
            } catch {
              // not ready yet
            }
            await new Promise((r) => setTimeout(r, 3000));
          }
          throw new Error(`Stellar Quickstart did not become ready within ${maxWaitMs}ms`);
        },

        /**
         * Fund a Stellar account using the Quickstart friendbot.
         */
        async fundStellarAccount({ horizonUrl, address }) {
          const url = `${horizonUrl}/friendbot?addr=${address}`;
          console.log(`[E2E] Funding account ${address} via friendbot…`);
          try {
            const res = await axios.get(url, { timeout: 15000 });
            return { success: true, hash: res.data?.hash };
          } catch (err) {
            // Account may already be funded – treat as non-fatal
            if (err.response?.status === 400) {
              console.log(`[E2E] Account ${address} already funded (or friendbot 400).`);
              return { success: true, alreadyFunded: true };
            }
            throw new Error(`Friendbot error: ${err.message}`);
          }
        },

        /**
         * Wait for the Vesting Vault backend to be ready.
         */
        async waitForBackend({ backendUrl, maxWaitMs = 60000 }) {
          const started = Date.now();
          const url = `${backendUrl}/health`;
          console.log(`[E2E] Waiting for backend at ${url}…`);

          while (Date.now() - started < maxWaitMs) {
            try {
              const res = await axios.get(url, { timeout: 5000 });
              if (res.data?.status === 'OK') {
                console.log('[E2E] Backend is ready.');
                return { ready: true };
              }
            } catch {
              // not ready yet
            }
            await new Promise((r) => setTimeout(r, 3000));
          }
          throw new Error(`Backend did not become ready within ${maxWaitMs}ms`);
        },

        /**
         * Log a message from the test to the Node console (useful for debugging CI).
         */
        log(msg) {
          console.log('[Cypress]', msg);
          return null;
        },
      });

      return config;
    },
  },
});
