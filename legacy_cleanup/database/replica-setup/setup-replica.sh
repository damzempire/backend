#!/bin/bash
set -e

# Wait for master to be ready
until pg_isready -h "$POSTGRES_MASTER_SERVICE" -p 5432 -U postgres; do
  echo "Waiting for master database to be ready..."
  sleep 2
done

# Stop PostgreSQL service
pg_ctl -D "$PGDATA" -m fast stop || true

# Clean up any existing data
rm -rf "$PGDATA"/*

# Create base backup from master
pg_basebackup -h "$POSTGRES_MASTER_SERVICE" -D "$PGDATA" -U "$POSTGRES_REPLICATION_USER" -v -P -W

# Create recovery configuration
cat > "$PGDATA/recovery.conf" <<EOF
standby_mode = 'on'
primary_conninfo = 'host=$POSTGRES_MASTER_SERVICE port=5432 user=$POSTGRES_REPLICATION_USER password=$POSTGRES_REPLICATION_PASSWORD application_name=replica'
restore_command = 'cp /var/lib/postgresql/archive/%f %p'
recovery_target_timeline = 'latest'
EOF

# Update postgresql.conf to include replica settings
cat >> "$PGDATA/postgresql.conf" <<EOF

# Replica-specific settings
hot_standby = on
max_standby_streaming_delay = 30s
max_standby_archive_delay = 30s
EOF

# Set proper permissions
chown -R postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"

# Start PostgreSQL
pg_ctl -D "$PGDATA" -l "$PGDATA/logfile" start
