#!/bin/bash
# Automated Postgres backup script

set -e

# Config
PG_DB="vestingvault"
PG_USER="postgres"
PG_HOST="localhost"
BACKUP_DIR="/var/backups/vestingvault"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
DUMP_FILE="$BACKUP_DIR/backup_$DATE.sql"
ARCHIVE_FILE="$DUMP_FILE.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Dump Postgres database
pg_dump -h "$PG_HOST" -U "$PG_USER" "$PG_DB" > "$DUMP_FILE"

# Compress the dump
gzip "$DUMP_FILE"

# Upload to S3 (requires AWS CLI configured with encryption)
S3_BUCKET="s3://vestingvault-backups"
aws s3 cp "$ARCHIVE_FILE" "$S3_BUCKET/" --sse AES256

# Cleanup old backups (local and S3)
find "$BACKUP_DIR" -name "*.gz" -mtime +30 -exec rm {} \;
aws s3 ls "$S3_BUCKET/" | awk '{print $4}' | while read file; do
  # Extract date from filename and check if older than 30 days
  FILE_DATE=$(echo $file | grep -oP '\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}')
  if [[ $FILE_DATE ]]; then
    FILE_TIMESTAMP=$(date -d "$FILE_DATE" +%s)
    THIRTY_DAYS_AGO=$(date -d '30 days ago' +%s)
    if (( FILE_TIMESTAMP < THIRTY_DAYS_AGO )); then
      aws s3 rm "$S3_BUCKET/$file"
    fi
  fi
done

# Log
echo "Backup completed and uploaded to S3: $ARCHIVE_FILE"
