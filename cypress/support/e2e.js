// ─────────────────────────────────────────────────────────────────────────────
// Cypress E2E Support File
// Loaded automatically before every spec file.
// ─────────────────────────────────────────────────────────────────────────────

// Load all custom commands
import './commands';

// ── Global Hooks ──────────────────────────────────────────────────────────────

before(() => {
  // Verify the backend is up before running any spec
  cy.task('waitForBackend', {
    backendUrl: Cypress.env('API_BASE_URL'),
    maxWaitMs: 60000,
  }).then(({ ready }) => {
    expect(ready).to.be.true;
  });
});

beforeEach(() => {
  // Clear any stale auth tokens between tests
  // (individual tests must call cy.loginWithAddress() explicitly)
  Cypress.env('ACCESS_TOKEN', null);
  Cypress.env('LOGGED_IN_ADDRESS', null);
});

// ── Uncaught Exception Handling ───────────────────────────────────────────────

// Prevent uncaught exceptions from failing tests unintentionally.
// Log them so they're still visible in the CI output.
Cypress.on('uncaught:exception', (err, runnable) => {
  cy.task('log', `[Uncaught] ${err.message}`);
  // Return false to prevent test failure on unhandled app errors
  return false;
});
