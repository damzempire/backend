#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vesting Vault — E2E Environment Setup
#
# Starts the full E2E stack (Stellar Quickstart + backend + postgres + redis),
# waits for each service to be healthy, funds test accounts, and optionally
# deploys the vesting-vault smart contract.
#
# Usage:
#   ./scripts/e2e-setup.sh [--skip-contracts]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
HORIZON_URL="${STELLAR_HORIZON_URL:-http://localhost:8000}"
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
COMPOSE_FILES="-f docker-compose.yml -f docker-compose.e2e.yml"

# Test accounts (matching cypress/fixtures/test-accounts.json)
ADMIN_ADDRESS="${TEST_ADMIN_ADDRESS:-GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN}"
BENEFICIARY_ADDRESS="${TEST_BENEFICIARY_ADDRESS:-GBXGQJWVLWOYHFLZTKAQGE3GYKI1KNNBNSFZL2LT9KCD4NZNEFX7Y6Z}"

SKIP_CONTRACTS=false
for arg in "$@"; do
  [[ "$arg" == "--skip-contracts" ]] && SKIP_CONTRACTS=true
done

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { echo "[E2E-setup] $*"; }
fail() { echo "[E2E-setup] ERROR: $*" >&2; exit 1; }

wait_for_http() {
  local url="$1"
  local label="$2"
  local max_attempts="${3:-60}"
  local attempt=0

  log "Waiting for ${label} at ${url}…"
  until curl -sf --max-time 5 "${url}" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [[ $attempt -ge $max_attempts ]]; then
      fail "${label} did not become ready after ${max_attempts} attempts."
    fi
    echo -n "."
    sleep 2
  done
  echo ""
  log "${label} is ready."
}

fund_account() {
  local address="$1"
  log "Funding account ${address} via friendbot…"
  local response
  response=$(curl -sf "${HORIZON_URL}/friendbot?addr=${address}" 2>&1 || true)
  if echo "$response" | grep -q '"hash"'; then
    log "Account ${address} funded successfully."
  else
    log "Friendbot response: ${response} (may already be funded — continuing)"
  fi
}

# ── Step 1: Start infrastructure services ─────────────────────────────────────
log "═══ Step 1: Starting infrastructure services ═══"
docker compose ${COMPOSE_FILES} up -d db redis stellar-quickstart

# ── Step 2: Wait for Stellar Quickstart ───────────────────────────────────────
log "═══ Step 2: Waiting for Stellar Quickstart ═══"
wait_for_http "${HORIZON_URL}" "Stellar Quickstart (Horizon)" 60

# ── Step 3: Start backend ──────────────────────────────────────────────────────
log "═══ Step 3: Starting backend ═══"
docker compose ${COMPOSE_FILES} up -d backend

# ── Step 4: Wait for backend ──────────────────────────────────────────────────
log "═══ Step 4: Waiting for backend ═══"
wait_for_http "${BACKEND_URL}/health" "Vesting Vault Backend" 40

# ── Step 5: Fund test accounts ────────────────────────────────────────────────
log "═══ Step 5: Funding test accounts ═══"
fund_account "${ADMIN_ADDRESS}"
fund_account "${BENEFICIARY_ADDRESS}"

# ── Step 6: (Optional) Deploy smart contracts ──────────────────────────────────
if [[ "${SKIP_CONTRACTS}" == "false" ]]; then
  log "═══ Step 6: Deploying vesting-vault smart contract ═══"

  if command -v stellar &>/dev/null; then
    # Deploy with Stellar CLI (previously known as soroban CLI)
    NETWORK_PASSPHRASE="Standalone Network ; February 2017"
    WASM_PATH="contracts/target/wasm32-unknown-unknown/release/vesting_vault.wasm"

    if [[ -f "$WASM_PATH" ]]; then
      log "Deploying contract from ${WASM_PATH}…"
      stellar contract deploy \
        --wasm "${WASM_PATH}" \
        --source-account "${TEST_ADMIN_SECRET:-SB3KJLX6RBUKWBSMJKYJQYXJH65VJZIKQSXQK6K5CGFBZQJDNIPWVML}" \
        --rpc-url "${HORIZON_URL}/rpc" \
        --network-passphrase "${NETWORK_PASSPHRASE}" \
        || log "Contract deployment returned non-zero (may already be deployed)"
    else
      log "Contract WASM not found at ${WASM_PATH}. Skipping deployment."
      log "To build: cd contracts && cargo build --target wasm32-unknown-unknown --release"
    fi
  else
    log "Stellar CLI not found. Skipping on-chain contract deployment."
    log "Install with: cargo install --locked stellar-cli"
  fi
else
  log "═══ Step 6: Skipping smart contract deployment (--skip-contracts) ═══"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
log ""
log "╔══════════════════════════════════════════════════════╗"
log "║   E2E Environment is READY                           ║"
log "║   Backend  : ${BACKEND_URL}"
log "║   Horizon  : ${HORIZON_URL}"
log "║   Soroban  : ${HORIZON_URL}/rpc"
log "╚══════════════════════════════════════════════════════╝"
log ""
log "Run Cypress tests with:"
log "  npx cypress run           # headless"
log "  npx cypress open          # interactive"
