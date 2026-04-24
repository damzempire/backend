# Scalable Database Architecture - Quick Start Guide

## 🚀 Getting Started

This guide helps you quickly deploy and test the scalable PostgreSQL architecture for the Vesting Vault platform.

## Prerequisites

- Docker & Docker Compose installed
- At least 8GB RAM available
- 50GB+ free disk space
- Git repository cloned locally

## Quick Deployment

### 1. Environment Setup
```bash
# Copy environment configuration
cp .env.staging .env.local

# Edit configuration (optional)
nano .env.local
```

### 2. Deploy the Cluster
```bash
# Make scripts executable
chmod +x scripts/deploy-scalable.sh
chmod +x scripts/test-scalability.sh

# Deploy for staging
./scripts/deploy-scalable.sh staging

# Or deploy for production
./scripts/deploy-scalable.sh production
```

### 3. Verify Deployment
```bash
# Check service status
docker-compose -f docker-compose-scalable.yml ps

# Test health endpoint
curl http://localhost:3001/health

# View metrics
curl http://localhost:3001/metrics
```

## 🧪 Run Tests

```bash
# Run comprehensive scalability tests
./scripts/test-scalability.sh staging
```

## 📊 Monitoring

### Health Dashboard
- **URL**: http://localhost:3001/health
- **Shows**: Master/replica status, replication lag, overall health

### Metrics
- **URL**: http://localhost:3001/metrics
- **Format**: Prometheus-style metrics
- **Use**: For monitoring systems like Grafana

## 🔧 Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| Backend API | 3000 | Main application |
| PgBouncer (Write) | 6432 | Write operations |
| PgBouncer (Read) | 6433 | Read operations |
| PostgreSQL Master | 5432 | Primary database |
| PostgreSQL Replica 1 | 5433 | Read replica 1 |
| PostgreSQL Replica 2 | 5434 | Read replica 2 |
| Redis | 6379 | Caching |
| Health Monitor | 3001 | Monitoring |

## 🏥 Health Checks

### Check Database Health
```bash
# Overall health
curl http://localhost:3001/health | jq .

# Cached health (faster)
curl http://localhost:3001/health/cached

# Detailed metrics
curl http://localhost:3001/metrics | head -20
```

### Manual Database Tests
```bash
# Test write connection
docker-compose exec pgbouncer-write psql -U postgres -d vesting_vault -c "SELECT 1;"

# Test read connection
docker-compose exec pgbouncer-read psql -U postgres -d vesting_vault -c "SELECT 1;"

# Check replication status
docker-compose exec postgres-master psql -U postgres -d vesting_vault -c "SELECT * FROM pg_stat_replication;"
```

## 🔄 Failover Testing

### Simulate Replica Failure
```bash
# Stop a replica
docker-compose stop postgres-replica-1

# Test reads still work
curl http://localhost:3001/health

# Restart replica
docker-compose start postgres-replica-1
```

### Check Failover Status
```bash
# Check failover service status
docker-compose exec backend node -e "
const failover = require('./src/services/databaseFailoverService');
console.log(JSON.stringify(failover.getFailoverStatus(), null, 2));
"
```

## 📈 Performance Testing

### Load Testing
```bash
# Run built-in performance tests
./scripts/test-scalability.sh staging

# Custom load test with artillery
artillery run artillery-tge-load-test.yml
```

### Monitor During Load
```bash
# Watch metrics in real-time
watch -n 5 'curl -s http://localhost:3001/metrics | grep database'

# Check connection pools
docker-compose exec pgbouncer-read psql -U postgres -d pgbouncer -c "SHOW POOLS;"
```

## 🛠️ Troubleshooting

### Common Issues

#### High Replica Lag
```bash
# Check replication lag
docker-compose exec postgres-replica-1 psql -U postgres -d vesting_vault -c "
SELECT pg_last_wal_replay_lsn() as replay_lsn;
"

# Check master WAL position
docker-compose exec postgres-master psql -U postgres -d vesting_vault -c "
SELECT pg_current_wal_lsn() as current_lsn;
"
```

#### Connection Issues
```bash
# Check PgBouncer status
docker-compose exec pgbouncer-read psql -U postgres -d pgbouncer -c "SHOW STATS;"

# Check active connections
docker-compose exec postgres-master psql -U postgres -d vesting_vault -c "SELECT * FROM pg_stat_activity;"
```

#### Service Failures
```bash
# View logs
docker-compose logs -f postgres-master
docker-compose logs -f pgbouncer-read
docker-compose logs -f backend

# Restart specific service
docker-compose restart postgres-replica-2
```

## 📝 Configuration

### Environment Variables
Key variables in `.env.local`:

```bash
# Enable cluster mode
DB_CLUSTER_MODE=true

# Replica lag threshold (bytes)
DB_REPLICA_LAG_THRESHOLD=1000

# Connection pool sizes
DB_POOL_SIZE_WRITE=20
DB_POOL_SIZE_READ=40
```

### Scaling Up
To add more replicas:

1. Edit `docker-compose-scalable.yml`
2. Add new replica service
3. Update `DB_READ_HOSTS` environment variable
4. Restart services

## 📚 Documentation

- **Full Architecture**: [SCALABLE_ARCHITECTURE.md](./SCALABLE_ARCHITECTURE.md)
- **Deployment Guide**: See Architecture docs
- **API Documentation**: Available at http://localhost:3000/docs

## 🆘 Support

### Getting Help
1. Check logs: `docker-compose logs -f`
2. Run health check: `curl http://localhost:3001/health`
3. Review troubleshooting section above
4. Check full documentation

### Emergency Procedures
- **Master Down**: Promote replica (manual process)
- **Replica Down**: Automatic failover handles this
- **All Replicas Down**: Reads fall back to master
- **Connection Pool Full**: Increase pool size

## 🎯 Success Criteria

Your deployment is successful when:

- [ ] All services are running (`docker-compose ps`)
- [ ] Health check returns "healthy" status
- [ ] Replication lag is < 1MB
- [ ] Both read and write operations work
- [ ] Failover tests pass
- [ ] Performance tests complete successfully

## 🔄 Maintenance

### Daily
- Check health status
- Monitor replica lag
- Review error logs

### Weekly
- Run full test suite
- Check disk space usage
- Review performance metrics

### Monthly
- Update PostgreSQL versions
- Rotate passwords
- Review backup procedures

---

**🎉 Congratulations!** You now have a scalable PostgreSQL architecture ready to handle 1 million users. The system automatically handles read/write splitting, failover, and performance optimization.
