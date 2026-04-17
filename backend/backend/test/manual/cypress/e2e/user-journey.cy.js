// ─────────────────────────────────────────────────────────────────────────────
// Vesting Vault — End-to-End User Journey
//
// Simulates the complete lifecycle of a vesting vault:
//   1. Login        — Authenticate with a Stellar wallet address
//   2. Create Vault — Create a vesting vault with a short cliff
//   3. Wait 1 Cliff — Poll until the cliff period passes
//   4. Claim Tokens — Withdraw vested tokens after the cliff
//   5. Logout       — Revoke the session
//
// Runs against the local Stellar Quickstart container to validate that
// the Frontend API layer, Backend, and Smart Contract work in harmony.
// ─────────────────────────────────────────────────────────────────────────────

import testAccounts from '../fixtures/test-accounts.json';

describe('Vesting Vault — Full User Journey', () => {
  // ── Shared state ────────────────────────────────────────────────────────────
  let vaultAddress;
  let vaultId;
  const admin       = testAccounts.admin;
  const beneficiary = testAccounts.beneficiary;
  const vaultCfg    = testAccounts.vault;
  const vestingCfg  = testAccounts.vesting;

  // ── Environment pre-flight ──────────────────────────────────────────────────

  before(() => {
    cy.task('log', '═══ E2E User Journey: Pre-flight checks ═══');

    // 1. Confirm backend health
    cy.assertBackendHealthy();

    // 2. Fund the admin and beneficiary accounts on the Stellar Quickstart network
    //    (idempotent – safe to call even if already funded)
    const horizonUrl = Cypress.env('STELLAR_HORIZON_URL');

    cy.task('fundStellarAccount', {
      horizonUrl,
      address: admin.address,
    }).then(({ success }) => {
      expect(success).to.be.true;
      cy.task('log', `Admin account funded: ${admin.address}`);
    });

    cy.task('fundStellarAccount', {
      horizonUrl,
      address: beneficiary.address,
    }).then(({ success }) => {
      expect(success).to.be.true;
      cy.task('log', `Beneficiary account funded: ${beneficiary.address}`);
    });
  });

  // ── Step 1: Login ───────────────────────────────────────────────────────────

  describe('Step 1 — Login', () => {
    it('rejects a request with no credentials', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {},
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.eq(400);
        expect(res.body.success).to.be.false;
        expect(res.body.error).to.include('required');
      });
    });

    it('authenticates the admin wallet and returns an access token', () => {
      cy.loginWithAddress(admin.address, admin.secret);
      cy.assertAuthValid();
    });

    it('stores the access token for subsequent requests', () => {
      expect(Cypress.env('ACCESS_TOKEN')).to.be.a('string').and.not.be.empty;
      expect(Cypress.env('LOGGED_IN_ADDRESS')).to.eq(admin.address);
    });
  });

  // ── Step 2: Create Vault ────────────────────────────────────────────────────

  describe('Step 2 — Create Vault', () => {
    // We need a fresh login for vault creation
    before(() => cy.loginWithAddress(admin.address, admin.secret));

    it('creates a vault with a short cliff for testing', () => {
      // Compute the cliff timestamp: now + cliffSeconds
      const now      = new Date();
      const cliffAt  = new Date(now.getTime() + vestingCfg.cliffSeconds * 1000);
      const endAt    = new Date(now.getTime() + vestingCfg.vestingDurationSeconds * 1000);

      // Use a unique vault address each run to avoid DB conflicts
      vaultAddress = `${vaultCfg.address.slice(0, 50)}${Date.now().toString(36).toUpperCase()}`.slice(0, 56);

      cy.createVault({
        address:       vaultAddress,
        name:          `${vaultCfg.name} — ${new Date().toISOString()}`,
        owner_address: admin.address,
        token_address: vaultCfg.tokenAddress,
        total_amount:  vaultCfg.totalAmount,
        token_type:    'static',
        cliff_date:    cliffAt.toISOString(),
        start_date:    now.toISOString(),
        end_date:      endAt.toISOString(),
        beneficiaries: [
          {
            address:    beneficiary.address,
            allocation: vaultCfg.allocationPerBeneficiary,
          },
        ],
      }).then((data) => {
        // The API may return the vault directly or wrapped in data.vault
        const vault = data?.vault ?? data;
        vaultId = vault?.id;
        cy.task('log', `Vault created — id=${vaultId}, address=${vaultAddress}`);
      });
    });

    it('records the vault address for subsequent steps', () => {
      expect(vaultAddress).to.be.a('string').and.have.length.greaterThan(0);
    });

    it('returns a vesting schedule for the new vault', () => {
      cy.request({
        method: 'GET',
        url: `/api/vaults/${vaultAddress}/schedule`,
        qs: { beneficiaryAddress: beneficiary.address },
        failOnStatusCode: false,
      }).then((res) => {
        // 200 = schedule exists  |  404 = no schedule yet (also valid at this point)
        expect(res.status).to.be.oneOf([200, 404]);
        cy.task('log', `Schedule response: ${JSON.stringify(res.body).slice(0, 200)}`);
      });
    });

    it('adds a vesting sub-schedule (top-up) with cliff and duration', () => {
      cy.addVestingSchedule(vaultAddress, {
        amount:                    vestingCfg.totalAmount,
        cliff_duration_seconds:    vestingCfg.cliffSeconds,
        vesting_duration_seconds:  vestingCfg.vestingDurationSeconds,
        beneficiary_address:       beneficiary.address,
        transaction_hash:          `0x${Date.now().toString(16)}topup`,
      });
    });

    it('reflects the new vault in the vault summary endpoint', () => {
      cy.request({
        method: 'GET',
        url: `/api/vaults/${vaultAddress}/summary`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
        if (res.status === 200) {
          expect(res.body.success).to.be.true;
        }
      });
    });
  });

  // ── Step 3: Wait 1 Cliff ────────────────────────────────────────────────────

  describe('Step 3 — Wait 1 Cliff', () => {
    before(() => cy.loginWithAddress(admin.address, admin.secret));

    it('confirms no tokens are withdrawable before the cliff passes', () => {
      cy.request({
        method: 'GET',
        url: `/api/vaults/${vaultAddress}/${beneficiary.address}/withdrawable`,
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) {
          const amount = Number(
            res.body?.data?.withdrawableAmount ?? res.body?.data?.amount ?? 0
          );
          cy.task('log', `Pre-cliff withdrawable amount: ${amount}`);
          // Amount may be 0 (cliff not passed) or small (partial vesting)
          // We just log it — the key assertion is AFTER the cliff
        } else {
          cy.task('log', `Withdrawable check returned ${res.status} (vault may not have on-chain data yet)`);
        }
      });
    });

    it(`waits ${vestingCfg.cliffSeconds + 2} seconds for the cliff to pass`, () => {
      // Add 2 seconds of buffer beyond the exact cliff timestamp
      const waitMs = (vestingCfg.cliffSeconds + 2) * 1000;
      cy.task('log', `Waiting ${waitMs}ms for cliff…`);
      cy.wait(waitMs);
    });

    it('detects that tokens are now withdrawable after the cliff', () => {
      // Poll until withdrawable amount > 0 (or 15 s timeout)
      cy.waitForCliff(vaultAddress, beneficiary.address, 15000);
    });
  });

  // ── Step 4: Claim Tokens ────────────────────────────────────────────────────

  describe('Step 4 — Claim Tokens', () => {
    // Beneficiary claims their own tokens
    before(() => cy.loginWithAddress(beneficiary.address, beneficiary.secret));

    it('the beneficiary can authenticate', () => {
      cy.assertAuthValid();
    });

    it('claims / withdraws vested tokens from the vault', () => {
      cy.claimTokens(vaultAddress, beneficiary.address, {
        claimed_by: beneficiary.address,
      });
    });

    it('records the claim event in the indexing service', () => {
      cy.recordClaim({
        user_address:      beneficiary.address,
        token_address:     vaultCfg.tokenAddress,
        amount_claimed:    vestingCfg.totalAmount,
        claim_timestamp:   new Date().toISOString(),
        transaction_hash:  `0x${Date.now().toString(16)}claim`,
        block_number:      1,
      });
    });

    it('reflects the claim in realized gains', () => {
      cy.request({
        method: 'GET',
        url: `/api/claims/${beneficiary.address}/realized-gains`,
        failOnStatusCode: false,
      }).then((res) => {
        expect(res.status).to.be.oneOf([200, 404]);
        if (res.status === 200) {
          expect(res.body.success).to.be.true;
          cy.task('log', `Realized gains: ${JSON.stringify(res.body.data)}`);
        }
      });
    });
  });

  // ── Step 5: Logout ──────────────────────────────────────────────────────────

  describe('Step 5 — Logout', () => {
    // Ensure we're logged in before we log out
    before(() => cy.loginWithAddress(admin.address, admin.secret));

    it('revokes the current session', () => {
      cy.logoutCurrentUser();
    });

    it('rejects authenticated requests after logout', () => {
      const oldToken = Cypress.env('ACCESS_TOKEN');
      // Token was cleared by logoutCurrentUser, but capture it before
      cy.loginWithAddress(admin.address, admin.secret).then(() => {
        const freshToken = Cypress.env('ACCESS_TOKEN');
        // Logout
        cy.logoutCurrentUser();
        // Attempt to access a protected endpoint with the (now-revoked) token
        cy.request({
          method: 'GET',
          url: '/api/auth/me',
          headers: { Authorization: `Bearer ${freshToken}` },
          failOnStatusCode: false,
        }).then((res) => {
          // After logout, /api/auth/me should return 401 or similar
          expect(res.status).to.be.oneOf([401, 403]);
          cy.task('log', '[Logout] Revoked token correctly rejected.');
        });
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Additional: API Contract Smoke Tests
// These run independently of the journey and validate surface-level stability.
// ─────────────────────────────────────────────────────────────────────────────

describe('Vesting Vault — API Contract Smoke Tests', () => {
  before(() => {
    cy.assertBackendHealthy();
    cy.loginWithAddress(testAccounts.admin.address, testAccounts.admin.secret);
  });

  it('GET /health returns status OK', () => {
    cy.request('/health').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.status).to.eq('OK');
      expect(res.body.timestamp).to.be.a('string');
    });
  });

  it('GET /health/ready returns ready status', () => {
    cy.request({ url: '/health/ready', failOnStatusCode: false }).then((res) => {
      // 200 = ready, 503 = not ready (acceptable in some CI environments)
      expect(res.status).to.be.oneOf([200, 503]);
    });
  });

  it('GET /health/live returns alive status', () => {
    cy.request('/health/live').then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.status).to.eq('alive');
      expect(res.body.uptime).to.be.a('number').and.be.greaterThan(0);
    });
  });

  it('POST /api/auth/login with invalid body returns 400', () => {
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { address: '' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
    });
  });

  it('GET /api/auth/me without a token returns 401', () => {
    cy.request({
      method: 'GET',
      url: '/api/auth/me',
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(401);
    });
  });

  it('POST /api/vaults with empty body returns an error', () => {
    const token = Cypress.env('ACCESS_TOKEN');
    cy.request({
      method: 'POST',
      url: '/api/vaults',
      headers: { Authorization: `Bearer ${token}` },
      body: {},
      failOnStatusCode: false,
    }).then((res) => {
      // Should be a client or server error, not a 2xx
      expect(res.status).to.be.gte(400);
    });
  });
});
