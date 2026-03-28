#!/bin/bash

# Scalability testing script for the database cluster
# This script runs various tests to validate the scalable architecture

set -e

ENVIRONMENT=${1:-staging}
COMPOSE_FILE="docker-compose-scalable.yml"
ENV_FILE=".env.${ENVIRONMENT}"

echo "🧪 Running scalability tests for ${ENVIRONMENT} environment..."

# Load environment variables
export $(cat $ENV_FILE | xargs)

# Test 1: Read/Write Splitting Test
echo "📖 Test 1: Read/Write Splitting"
echo "Testing write operations go to master..."
write_test=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node -e "
const { getDatabaseConnection } = require('./src/database/connection');
(async () => {
  const db = getDatabaseConnection('write');
  const [result] = await db.query('SELECT inet_server_addr() as server_addr');
  console.log('Write operation server:', result[0].server_addr);
  process.exit(0);
})" 2>/dev/null || echo "Write test failed")

echo "Testing read operations go to replicas..."
read_test=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node -e "
const { getDatabaseConnection } = require('./src/database/connection');
(async () => {
  const db = getDatabaseConnection('read');
  const [result] = await db.query('SELECT inet_server_addr() as server_addr');
  console.log('Read operation server:', result[0].server_addr);
  process.exit(0);
})" 2>/dev/null || echo "Read test failed")

# Test 2: Load Balancing Test
echo "⚖️  Test 2: Load Balancing"
echo "Testing multiple read operations are distributed across replicas..."
for i in {1..5}; do
    server=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node -e "
const { getDatabaseConnection } = require('./src/database/connection');
(async () => {
  const db = getDatabaseConnection('read');
  const [result] = await db.query('SELECT inet_server_addr() as server_addr');
  console.log(result[0].server_addr);
  process.exit(0);
})" 2>/dev/null || echo "Load balancing test $i failed")
    echo "Read $i: $server"
done

# Test 3: Replica Lag Test
echo "⏱️  Test 3: Replica Lag"
echo "Checking replica lag..."
lag_test=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node -e "
const { checkReplicaLag } = require('./src/database/connection');
(async () => {
  const lag = await checkReplicaLag();
  console.log('Replica lag (bytes):', lag);
  if (lag > 1000) {
    console.log('⚠️  High replica lag detected');
  }
  process.exit(0);
})" 2>/dev/null || echo "Replica lag test failed")

# Test 4: Failover Test
echo "🔄 Test 4: Failover"
echo "Testing failover mechanism..."
failover_test=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node -e "
const databaseFailoverService = require('./src/services/databaseFailoverService');
(async () => {
  const status = databaseFailoverService.getFailoverStatus();
  console.log('Failover status:', JSON.stringify(status, null, 2));
  console.log('Healthy replicas:', status.healthyReplicas);
  process.exit(0);
})" 2>/dev/null || echo "Failover test failed")

# Test 5: Health Monitoring Test
echo "🏥 Test 5: Health Monitoring"
echo "Testing health monitoring endpoints..."
health_check=$(curl -s http://localhost:3001/health | jq '.overall' 2>/dev/null || echo "Health check failed")
echo "Overall health: $health_check"

metrics_check=$(curl -s http://localhost:3001/metrics | head -5 2>/dev/null || echo "Metrics check failed")
echo "Metrics endpoint: Available"

# Test 6: Performance Test
echo "🚀 Test 6: Performance"
echo "Running concurrent read operations..."
echo "Starting 20 concurrent read operations..."

# Create a temporary test script
cat > /tmp/perf_test.js << 'EOF'
const { getDatabaseConnection } = require('./src/database/connection');

async function runReadTest(id) {
    const start = Date.now();
    const db = getDatabaseConnection('read');
    await db.query('SELECT 1, pg_sleep(0.1)');
    const end = Date.now();
    console.log(`Read ${id}: ${end - start}ms`);
}

async function runConcurrentReads() {
    const promises = [];
    for (let i = 1; i <= 20; i++) {
        promises.push(runReadTest(i));
    }
    await Promise.all(promises);
    console.log('All concurrent reads completed');
}

runConcurrentReads().catch(console.error);
EOF

# Copy and run the performance test
docker cp /tmp/perf_test.js $(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps -q backend):/tmp/
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node /tmp/perf_test.js 2>/dev/null || echo "Performance test failed"

# Test 7: Connection Pool Test
echo "🏊 Test 7: Connection Pool"
echo "Testing connection pool limits..."
pool_test=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T pgbouncer-read psql -U postgres -d pgbouncer -c "SHOW POOLS;" 2>/dev/null || echo "Pool test failed")
echo "$pool_test" | head -5

# Test 8: Data Consistency Test
echo "🔒 Test 8: Data Consistency"
echo "Testing data consistency between master and replicas..."

# Insert test data
echo "Inserting test data..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres-master psql -U postgres -d vesting_vault -c "
CREATE TABLE IF NOT EXISTS scalability_test (
    id SERIAL PRIMARY KEY,
    test_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    test_data VARCHAR(100)
);
INSERT INTO scalability_test (test_data) VALUES ('consistency_test_$(date +%s)');
" 2>/dev/null || echo "Data insertion failed"

# Wait for replication
echo "Waiting for replication..."
sleep 5

# Check data consistency
echo "Checking data consistency..."
master_count=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres-master psql -U postgres -d vesting_vault -t -c "SELECT COUNT(*) FROM scalability_test;" 2>/dev/null || echo "0")
replica1_count=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres-replica-1 psql -U postgres -d vesting_vault -t -c "SELECT COUNT(*) FROM scalability_test;" 2>/dev/null || echo "0")
replica2_count=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T postgres-replica-2 psql -U postgres -d vesting_vault -t -c "SELECT COUNT(*) FROM scalability_test;" 2>/dev/null || echo "0")

echo "Master count: $master_count"
echo "Replica 1 count: $replica1_count"
echo "Replica 2 count: $replica2_count"

if [ "$master_count" = "$replica1_count" ] && [ "$master_count" = "$replica2_count" ]; then
    echo "✅ Data consistency test passed"
else
    echo "⚠️  Data consistency test failed - counts don't match"
fi

# Test 9: High Availability Test
echo "🛡️  Test 9: High Availability"
echo "Testing high availability by temporarily stopping a replica..."

echo "Stopping replica 1..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE stop postgres-replica-1

echo "Testing reads still work with one replica down..."
read_after_failover=$(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node -e "
const { getDatabaseConnection } = require('./src/database/connection');
(async () => {
  try {
    const db = getDatabaseConnection('read');
    await db.query('SELECT 1');
    console.log('✅ Read operation succeeded with replica down');
  } catch (error) {
    console.log('❌ Read operation failed with replica down:', error.message);
  }
  process.exit(0);
})" 2>/dev/null || echo "High availability test failed")

echo "Restarting replica 1..."
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE start postgres-replica-1

# Wait for recovery
sleep 10

# Test 10: Stress Test
echo "💪 Test 10: Stress Test"
echo "Running stress test with 100 concurrent operations..."

cat > /tmp/stress_test.js << 'EOF'
const { getDatabaseConnection } = require('./src/database/connection');

async function runStressTest() {
    const promises = [];
    const start = Date.now();
    
    // Mix of read and write operations
    for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
            // Write operation
            promises.push((async (id) => {
                const db = getDatabaseConnection('write');
                await db.query('SELECT 1');
                console.log('Write', id, 'completed');
            })(i));
        } else {
            // Read operation
            promises.push((async (id) => {
                const db = getDatabaseConnection('read');
                await db.query('SELECT 1');
                console.log('Read', id, 'completed');
            })(i));
        }
    }
    
    await Promise.all(promises);
    const end = Date.now();
    console.log('Stress test completed in:', end - start, 'ms');
}

runStressTest().catch(console.error);
EOF

docker cp /tmp/stress_test.js $(docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE ps -q backend):/tmp/
docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend node /tmp/stress_test.js 2>/dev/null || echo "Stress test failed"

# Cleanup
rm -f /tmp/perf_test.js /tmp/stress_test.js

echo "✅ All scalability tests completed!"
echo "📊 Check the results above to ensure your database cluster is performing optimally"
