#!/bin/bash

# Deployment script for scalable database architecture
# This script sets up and deploys the PostgreSQL master-replica cluster with PgBouncer

set -e

# Configuration
ENVIRONMENT=${1:-staging}
COMPOSE_FILE="docker-compose-scalable.yml"
ENV_FILE=".env.${ENVIRONMENT}"

echo "🚀 Deploying scalable database architecture for ${ENVIRONMENT}..."

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Environment file $ENV_FILE not found!"
    echo "Available environment files:"
    ls -la .env.* | grep -v ".example"
    exit 1
fi

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "❌ Docker compose file $COMPOSE_FILE not found!"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p database/master-config
mkdir -p database/replica-config
mkdir -p database/replica-setup
mkdir -p database/pgbouncer
mkdir -p database/health-monitor
mkdir -p logs
mkdir -p postgres_data
mkdir -p postgres_replica_1_data
mkdir -p postgres_replica_2_data
mkdir -p redis_data

# Set proper permissions
echo "🔐 Setting permissions..."
chmod +x database/replica-setup/setup-replica.sh
chmod 755 database/replica-setup/
chmod 755 database/master-config/
chmod 755 database/replica-config/
chmod 755 database/pgbouncer/

# Load environment variables
echo "📋 Loading environment variables from $ENV_FILE..."
export $(cat $ENV_FILE | xargs)

# Validate required environment variables
echo "✅ Validating environment variables..."
required_vars=(
    "DB_CLUSTER_MODE"
    "DB_WRITE_HOST"
    "DB_READ_HOST"
    "POSTGRES_PASSWORD"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Required environment variable $var is not set!"
        exit 1
    fi
done

echo "✅ Environment validation passed"

# Stop existing services
echo "🛑 Stopping existing services..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE down

# Clean up old containers and volumes (optional)
if [ "$2" = "--clean" ]; then
    echo "🧹 Cleaning up old containers and volumes..."
    docker system prune -f
    docker volume prune -f
fi

# Build and start services
echo "🔨 Building and starting services..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service health
echo "🏥 Checking service health..."
services=("postgres-master" "postgres-replica-1" "postgres-replica-2" "pgbouncer-write" "pgbouncer-read" "backend" "redis")

for service in "${services[@]}"; do
    echo "Checking $service..."
    if docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps $service | grep -q "Up"; then
        echo "✅ $service is running"
    else
        echo "❌ $service is not running"
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs $service
    fi
done

# Test database connectivity
echo "🔌 Testing database connectivity..."
echo "Testing write database connection..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T pgbouncer-write psql -U postgres -d vesting_vault -c "SELECT 1 as test_connection;" || echo "⚠️  Write database connection failed"

echo "Testing read database connection..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T pgbouncer-read psql -U postgres -d vesting_vault -c "SELECT 1 as test_connection;" || echo "⚠️  Read database connection failed"

# Test replication status
echo "🔄 Testing replication status..."
echo "Checking master-replica replication..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres-master psql -U postgres -d vesting_vault -c "SELECT pg_current_wal_lsn() as master_lsn;" || echo "⚠️  Master LSN check failed"

for replica in 1 2; do
    echo "Checking replica $replica replication status..."
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres-replica-$replica psql -U postgres -d vesting_vault -c "SELECT pg_last_wal_replay_lsn() as replica_lsn;" || echo "⚠️  Replica $replica LSN check failed"
done

# Run database health check
echo "🏥 Running database health check..."
if docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T db-health-monitor node -e "require('http').get('http://localhost:3001/health', (res) => { console.log('Health check status:', res.statusCode); process.exit(res.statusCode === 200 ? 0 : 1); })"; then
    echo "✅ Database health check passed"
else
    echo "⚠️  Database health check failed"
fi

# Display service URLs and ports
echo "🌐 Service URLs and Ports:"
echo "Backend API: http://localhost:3000"
echo "PgBouncer Write: localhost:6432"
echo "PgBouncer Read: localhost:6433"
echo "PostgreSQL Master: localhost:5432"
echo "PostgreSQL Replica 1: localhost:5433"
echo "PostgreSQL Replica 2: localhost:5434"
echo "Redis: localhost:6379"
echo "Health Monitor: http://localhost:3001"
echo "Metrics: http://localhost:3001/metrics"

# Show logs for any failed services
echo "📋 Showing logs for any services that might need attention..."
for service in "${services[@]}"; do
    if ! docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps $service | grep -q "Up"; then
        echo "📄 Logs for $service:"
        docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs --tail=20 $service
    fi
done

echo "✅ Deployment completed!"
echo "📊 To monitor the database cluster, visit: http://localhost:3001/health"
echo "📈 To view metrics, visit: http://localhost:3001/metrics"
echo "🔍 To check logs, run: docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE logs -f [service-name]"
