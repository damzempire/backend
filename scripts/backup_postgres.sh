#!/bin/bash
# Automated PostgreSQL backup script — Issue #262
# Features: pg_dump → gzip → AES-256 encryption → S3 upload → retention cleanup
#
# Required env vars (or set defaults below):
#   PG_DB, PG_USER, PG_HOST, PG_PORT, PG_PASSWORD
#   BACKUP_DIR, S3_BUCKET, BACKUP_ENCRYPTION_KEY
#
# Usage: ./backup_postgres.sh
# Cron example (daily at 2 AM): 0 2 * * * /path/to/backup_postgres.sh >> /var/log/vestingvault-backup.log 2>&1

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration (override via environment variables)
# ---------------------------------------------------------------------------
PG_DB="${PG_DB:-vestingvault}"
PG_USER="${PG_USER:-postgres}"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/vestingvault}"
S3_BUCKET="${S3_BUCKET:-s3://vestingvault-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Encryption key — MUST be set in production via a secrets manager or env
if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  echo "ERROR: BACKUP_ENCRYPTION_KEY is not set. Aborting." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DUMP_FILE="$BACKUP_DIR/backup_$DATE.sql"
ARCHIVE_FILE="$DUMP_FILE.gz"
ENCRYPTED_FILE="$ARCHIVE_FILE.enc"

mkdir -p "$BACKUP_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ---------------------------------------------------------------------------
# 1. Dump
# ---------------------------------------------------------------------------
log "Starting pg_dump for database '$PG_DB' on $PG_HOST:$PG_PORT ..."
PGPASSWORD="$PG_PASSWORD" pg_dump \
  -h "$PG_HOST" \
  -p "$PG_PORT" \
  -U "$PG_USER" \
  --format=plain \
  --no-password \
  "$PG_DB" > "$DUMP_FILE"
log "Dump complete: $DUMP_FILE ($(du -sh "$DUMP_FILE" | cut -f1))"

# ---------------------------------------------------------------------------
# 2. Compress
# ---------------------------------------------------------------------------
log "Compressing ..."
gzip -9 "$DUMP_FILE"
log "Compressed: $ARCHIVE_FILE ($(du -sh "$ARCHIVE_FILE" | cut -f1))"

# ---------------------------------------------------------------------------
# 3. Encrypt (AES-256-CBC via OpenSSL)
# ---------------------------------------------------------------------------
log "Encrypting ..."
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 \
  -pass "env:BACKUP_ENCRYPTION_KEY" \
  -in  "$ARCHIVE_FILE" \
  -out "$ENCRYPTED_FILE"
# Remove unencrypted archive immediately
rm -f "$ARCHIVE_FILE"
log "Encrypted: $ENCRYPTED_FILE ($(du -sh "$ENCRYPTED_FILE" | cut -f1))"

# ---------------------------------------------------------------------------
# 4. Upload to S3 with server-side encryption
# ---------------------------------------------------------------------------
log "Uploading to $S3_BUCKET ..."
aws s3 cp "$ENCRYPTED_FILE" "$S3_BUCKET/" \
  --sse aws:kms \
  --storage-class STANDARD_IA
log "Upload complete."

# ---------------------------------------------------------------------------
# 5. Verify upload
# ---------------------------------------------------------------------------
REMOTE_KEY="$(basename "$ENCRYPTED_FILE")"
aws s3 ls "$S3_BUCKET/$REMOTE_KEY" > /dev/null
log "Remote file verified: $REMOTE_KEY"

# ---------------------------------------------------------------------------
# 6. Local retention cleanup (keep last N days)
# ---------------------------------------------------------------------------
log "Cleaning up local backups older than $RETENTION_DAYS days ..."
find "$BACKUP_DIR" -name "*.enc" -mtime +"$RETENTION_DAYS" -delete

# ---------------------------------------------------------------------------
# 7. S3 retention cleanup
# ---------------------------------------------------------------------------
log "Cleaning up S3 backups older than $RETENTION_DAYS days ..."
CUTOFF=$(date -d "$RETENTION_DAYS days ago" +%s)
aws s3 ls "$S3_BUCKET/" | while read -r _size _date _time file; do
  FILE_DATE=$(echo "$file" | grep -oP '\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}' || true)
  if [[ -n "$FILE_DATE" ]]; then
    FILE_TS=$(date -d "${FILE_DATE//_/ }" +%s 2>/dev/null || true)
    if [[ -n "$FILE_TS" && "$FILE_TS" -lt "$CUTOFF" ]]; then
      log "Removing old S3 backup: $file"
      aws s3 rm "$S3_BUCKET/$file"
    fi
  fi
done

log "Backup finished successfully: $ENCRYPTED_FILE"
