#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Vesting Vault — E2E Environment Teardown
#
# Stops and removes all E2E containers and (optionally) volumes.
#
# Usage:
#   ./scripts/e2e-teardown.sh [--volumes]
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.e2e.yml"
REMOVE_VOLUMES=false

for arg in "$@"; do
  [[ "$arg" == "--volumes" ]] && REMOVE_VOLUMES=true
done

log() { echo "[E2E-teardown] $*"; }

log "Stopping E2E containers…"
if [[ "${REMOVE_VOLUMES}" == "true" ]]; then
  docker compose ${COMPOSE_FILES} down --volumes --remove-orphans
  log "Containers and volumes removed."
else
  docker compose ${COMPOSE_FILES} down --remove-orphans
  log "Containers removed (volumes preserved)."
fi

log "Done."
