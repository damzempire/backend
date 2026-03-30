// ─────────────────────────────────────────────────────────────────────────────
// Custom Cypress Commands for Vesting Vault E2E Tests
// ─────────────────────────────────────────────────────────────────────────────

const API = () => Cypress.env('API_BASE_URL');

// ── Auth Commands ─────────────────────────────────────────────────────────────

/**
 * Login with a Stellar wallet address.
 * Stores the access token in Cypress.env so all subsequent requests can use it.
 *
 * @param {string} address  - Stellar public key (G...)
 * @param {string} [secret] - Stellar secret key (S...) used to produce a mock signature
 */
Cypress.Commands.add('loginWithAddress', (address, secret = 'mock-signature') => {
  cy.log(`[Auth] Logging in as ${address.slice(0, 8)}…`);

  cy.request({
    method: 'POST',
    url: `${API()}/api/auth/login`,
    body: { address, signature: secret },
    failOnStatusCode: false,
  }).then((res) => {
    expect(res.status, 'Login should return 200').to.eq(200);
    expect(res.body.success).to.be.true;
    expect(res.body.data.accessToken).to.be.a('string');

    // Stash the token for all future cy.apiRequest() calls
    Cypress.env('ACCESS_TOKEN', res.body.data.accessToken);
    Cypress.env('LOGGED_IN_ADDRESS', address);
    cy.log(`[Auth] Logged in. Token stored.`);
  });
});

/**
 * Logout the currently authenticated user.
 */
Cypress.Commands.add('logoutCurrentUser', () => {
  const token = Cypress.env('ACCESS_TOKEN');
  cy.log('[Auth] Logging out…');

  cy.request({
    method: 'POST',
    url: `${API()}/api/auth/logout`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    failOnStatusCode: false,
  }).then((res) => {
    expect(res.status, 'Logout should return 200').to.eq(200);
    expect(res.body.success).to.be.true;

    Cypress.env('ACCESS_TOKEN', null);
    Cypress.env('LOGGED_IN_ADDRESS', null);
    cy.log('[Auth] Logged out successfully.');
  });
});

// ── Vault Commands ────────────────────────────────────────────────────────────

/**
 * Create a vesting vault via the API.
 * Yields the created vault data.
 *
 * @param {object} vaultParams
 */
Cypress.Commands.add('createVault', (vaultParams) => {
  const token = Cypress.env('ACCESS_TOKEN');
  cy.log(`[Vault] Creating vault: ${vaultParams.name}`);

  cy.request({
    method: 'POST',
    url: `${API()}/api/vaults`,
    headers: { Authorization: `Bearer ${token}` },
    body: vaultParams,
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status !== 201 && res.status !== 200) {
      cy.log(`[Vault] Create failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
    expect(res.status, 'Create vault should return 201').to.be.oneOf([200, 201]);
    expect(res.body.success).to.be.true;
    cy.log(`[Vault] Vault created: ${JSON.stringify(res.body.data)}`);
  }).then((res) => res.body.data);
});

/**
 * Add a vesting sub-schedule (top-up with cliff/vesting duration) to an existing vault.
 *
 * @param {string} vaultAddress
 * @param {object} scheduleParams
 */
Cypress.Commands.add('addVestingSchedule', (vaultAddress, scheduleParams) => {
  const token = Cypress.env('ACCESS_TOKEN');
  cy.log(`[Vault] Adding schedule to ${vaultAddress.slice(0, 8)}…`);

  cy.request({
    method: 'POST',
    url: `${API()}/api/vaults/${vaultAddress}/top-up`,
    headers: { Authorization: `Bearer ${token}` },
    body: scheduleParams,
    failOnStatusCode: false,
  }).then((res) => {
    if (res.status !== 201 && res.status !== 200) {
      cy.log(`[Schedule] Failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
    expect(res.status, 'Add vesting schedule should succeed').to.be.oneOf([200, 201]);
    expect(res.body.success).to.be.true;
  }).then((res) => res.body.data);
});

/**
 * Poll the withdrawable-amount endpoint until the cliff has passed
 * (i.e., until withdrawable > 0) or until a timeout is reached.
 *
 * @param {string} vaultAddress
 * @param {string} beneficiaryAddress
 * @param {number} [maxWaitMs=30000]
 */
Cypress.Commands.add('waitForCliff', (vaultAddress, beneficiaryAddress, maxWaitMs = 30000) => {
  cy.log(`[Cliff] Waiting for cliff on vault ${vaultAddress.slice(0, 8)}…`);

  const pollUntilWithdrawable = (startTime) => {
    cy.request({
      method: 'GET',
      url: `${API()}/api/vaults/${vaultAddress}/${beneficiaryAddress}/withdrawable`,
      failOnStatusCode: false,
    }).then((res) => {
      const elapsed = Date.now() - startTime;
      const amount = res.body?.data?.withdrawableAmount ?? res.body?.data?.amount ?? 0;
      cy.log(`[Cliff] elapsed=${elapsed}ms, withdrawable=${amount}`);

      if (Number(amount) > 0) {
        cy.log('[Cliff] Cliff has passed. Tokens are withdrawable.');
      } else if (elapsed < maxWaitMs) {
        // Wait 1 second then retry
        cy.wait(1000).then(() => pollUntilWithdrawable(startTime));
      } else {
        throw new Error(`Cliff did not pass within ${maxWaitMs}ms`);
      }
    });
  };

  cy.wrap(Date.now()).then(pollUntilWithdrawable);
});

/**
 * Claim / withdraw tokens for a beneficiary.
 * Uses the on-chain withdraw flow: POST /api/vaults/:vault/:beneficiary/withdraw
 *
 * @param {string} vaultAddress
 * @param {string} beneficiaryAddress
 * @param {object} [extra] - Additional body params (transaction_hash, etc.)
 */
Cypress.Commands.add('claimTokens', (vaultAddress, beneficiaryAddress, extra = {}) => {
  const token = Cypress.env('ACCESS_TOKEN');
  cy.log(`[Claim] Claiming tokens from vault ${vaultAddress.slice(0, 8)} for ${beneficiaryAddress.slice(0, 8)}…`);

  cy.request({
    method: 'POST',
    url: `${API()}/api/vaults/${vaultAddress}/${beneficiaryAddress}/withdraw`,
    headers: { Authorization: `Bearer ${token}` },
    body: {
      transaction_hash: `0x${Date.now().toString(16)}test`,
      ...extra,
    },
    failOnStatusCode: false,
  }).then((res) => {
    cy.log(`[Claim] Response (${res.status}): ${JSON.stringify(res.body)}`);
    // The backend may return 200 or 201 for a successful claim
    expect(res.status, 'Claim should succeed').to.be.oneOf([200, 201]);
    expect(res.body.success).to.be.true;
    cy.log('[Claim] Tokens claimed successfully.');
  }).then((res) => res.body.data);
});

/**
 * Record a claim event in the indexing service.
 * Uses POST /api/claims (separate from the on-chain withdraw flow).
 *
 * @param {object} claimData
 */
Cypress.Commands.add('recordClaim', (claimData) => {
  const token = Cypress.env('ACCESS_TOKEN');
  cy.log('[Claim] Recording claim event…');

  cy.request({
    method: 'POST',
    url: `${API()}/api/claims`,
    headers: { Authorization: `Bearer ${token}` },
    body: claimData,
    failOnStatusCode: false,
  }).then((res) => {
    cy.log(`[Claim] Record response (${res.status}): ${JSON.stringify(res.body)}`);
    expect(res.status, 'Record claim should return 201').to.be.oneOf([200, 201]);
    expect(res.body.success).to.be.true;
  }).then((res) => res.body.data);
});

// ── Utility Commands ──────────────────────────────────────────────────────────

/**
 * Assert that the API's /health endpoint returns OK.
 */
Cypress.Commands.add('assertBackendHealthy', () => {
  cy.request(`${API()}/health`).then((res) => {
    expect(res.status).to.eq(200);
    expect(res.body.status).to.eq('OK');
    cy.log('[Health] Backend is healthy.');
  });
});

/**
 * Assert that the authenticated user's session is valid.
 */
Cypress.Commands.add('assertAuthValid', () => {
  const token = Cypress.env('ACCESS_TOKEN');
  cy.request({
    method: 'GET',
    url: `${API()}/api/auth/me`,
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => {
    expect(res.status).to.eq(200);
    expect(res.body.success).to.be.true;
    expect(res.body.data.address).to.eq(Cypress.env('LOGGED_IN_ADDRESS'));
    cy.log(`[Auth] Session valid for ${res.body.data.address}`);
  });
});
