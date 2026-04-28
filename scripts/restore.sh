#!/bin/bash
# PostgreSQL restore script — Issue #262
# Restores a backup created by backup_postgres.sh
#
# Usage:
#   ./restore.sh <backup-file-or-s3-key>
#
# Examples:
#   ./restore.sh /var/backups/vestingvault/backup_2026-04-27_02-00-00.sql.gz.enc
#   ./restore.sh s3://vestingvault-backups/backup_2026-04-27_02-00-00.sql.gz.enc
#
# Required env vars:
#   PG_DB, PG_USER, PG_HOST, PG_PORT, PG_PASSWORD, BACKUP_ENCRYPTION_KEY

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
PG_DB="${PG_DB:-vestingvault}"
PG_USER="${PG_USER:-postgres}"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
RESTORE_TMP_DIR="${RESTORE_TMP_DIR:-/tmp/vestingvault-restore}"

if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "ERROR: BACKUP_ENCRYPTION_KEY is not set. Aborting." >&2
  exit 1
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file-or-s3-uri>" >&2
  exit 1
fi

BACKUP_SOURCE="$1"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ---------------------------------------------------------------------------
# Cleanup on exit
# ---------------------------------------------------------------------------
cleanup() {
  log "Cleaning up temporary files ..."
  rm -rf "$RESTORE_TMP_DIR"
}
trap cleanup EXIT

mkdir -p "$RESTORE_TMP_DIR"

# ---------------------------------------------------------------------------
# 1. Obtain the encrypted file
# ---------------------------------------------------------------------------
ENCRYPTED_FILE="$RESTORE_TMP_DIR/$(basename "$BACKUP_SOURCE")"

if [[ "$BACKUP_SOURCE" == s3://* ]]; then
  log "Downloading from S3: $BACKUP_SOURCE ..."
  aws s3 cp "$BACKUP_SOURCE" "$ENCRYPTED_FILE"
  log "Download complete."
else
  log "Using local file: $BACKUP_SOURCE"
  cp "$BACKUP_SOURCE" "$ENCRYPTED_FILE"
fi

# ---------------------------------------------------------------------------
# 2. Decrypt
# ---------------------------------------------------------------------------
ARCHIVE_FILE="${ENCRYPTED_FILE%.enc}"
log "Decrypting ..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -pass "env:BACKUP_ENCRYPTION_KEY" \
  -in  "$ENCRYPTED_FILE" \
  -out "$ARCHIVE_FILE"
log "Decrypted: $ARCHIVE_FILE"

# ---------------------------------------------------------------------------
# 3. Decompress
# ---------------------------------------------------------------------------
DUMP_FILE="${ARCHIVE_FILE%.gz}"
log "Decompressing ..."
gunzip -c "$ARCHIVE_FILE" > "$DUMP_FILE"
log "Decompressed: $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

# ---------------------------------------------------------------------------
# 4. Confirm before restoring
# ---------------------------------------------------------------------------
echo ""
echo "WARNING: This will DROP and recreate the database '$PG_DB' on $PG_HOST:$PG_PORT."
echo "All existing data will be LOST."
read -r -p "Type 'yes' to continue: " CONFIRM
if [[ "$CONFIRM" != "yes" ]]; then
  echo "Restore cancelled."
  exit 0
fi

# ---------------------------------------------------------------------------
# 5. Drop and recreate the database
# ---------------------------------------------------------------------------
log "Dropping existing database '$PG_DB' ..."
PGPASSWORD="$PG_PASSWORD" psql \
  -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" \
  -c "DROP DATABASE IF EXISTS \"$PG_DB\";"

log "Creating database '$PG_DB' ..."
PGPASSWORD="$PG_PASSWORD" psql \
  -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" \
  -c "CREATE DATABASE \"$PG_DB\";"

# ---------------------------------------------------------------------------
# 6. Restore
# ---------------------------------------------------------------------------
log "Restoring from $DUMP_FILE ..."
PGPASSWORD="$PG_PASSWORD" psql \
  -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" \
  -d "$PG_DB" \
  -f "$DUMP_FILE"

log "Restore complete. Database '$PG_DB' is ready."

# ---------------------------------------------------------------------------
# 7. Smoke test — verify at least one table exists
# ---------------------------------------------------------------------------
TABLE_COUNT=$(PGPASSWORD="$PG_PASSWORD" psql \
  -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" \
  -d "$PG_DB" -t -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" \
  | tr -d ' ')

if [[ "$TABLE_COUNT" -gt 0 ]]; then
  log "Smoke test passed: $TABLE_COUNT public table(s) found."
else
  log "WARNING: No public tables found after restore. Please verify manually."
  exit 1
fi
