# Multi-Cloud Database Failover Strategy

## Overview

This implementation provides a robust multi-cloud database failover system for the Vesting Vault backend, ensuring 99.99% uptime for critical financial data. The system automatically switches between primary and secondary database instances when the primary becomes unavailable.

## Architecture

### Primary Database (AWS PostgreSQL)
- **Provider**: AWS RDS PostgreSQL
- **Role**: Primary read-write database
- **Connection**: Direct application queries

### Secondary Database (Google Cloud MySQL/DigitalOcean PostgreSQL)
- **Provider**: Google Cloud SQL or DigitalOcean Managed Database
- **Role**: Warm standby, read-only during failover
- **Connection**: Automatic failover when primary is unavailable

### Heartbeat Monitoring
- **Frequency**: Every 10 seconds
- **Timeout**: 30 seconds for failover trigger
- **Method**: Simple `SELECT 1` query with response time tracking

## Features

### ✅ Automatic Failover
- Detects primary database unavailability within 30 seconds
- Automatically switches to secondary database
- Enters read-only mode to ensure data consistency

### ✅ Heartbeat Monitoring
- Continuous health checks every 10 seconds
- Response time tracking for performance monitoring
- Automatic recovery when primary database comes back online

### ✅ Read-Only Mode
- Prevents write operations during failover scenarios
- Protects data consistency across database instances
- Automatic read-write mode restoration on recovery

### ✅ Multi-Cloud Support
- Supports PostgreSQL and MySQL databases
- Configurable for different cloud providers
- SSL/TLS connection support

## Configuration

### Environment Variables

```bash
# Primary Database (AWS PostgreSQL)
DB_PRIMARY_HOST=your-aws-rds-host.rds.amazonaws.com
DB_PRIMARY_PORT=5432
DB_PRIMARY_NAME=vesting_vault
DB_PRIMARY_USER=postgres
DB_PRIMARY_PASSWORD=your_secure_password
DB_PRIMARY_SSL=true

# Secondary Database (Google Cloud MySQL)
DB_SECONDARY_HOST=your-gcp-host.cloudsql.com
DB_SECONDARY_PORT=3306
DB_SECONDARY_NAME=vesting_vault_backup
DB_SECONDARY_USER=root
DB_SECONDARY_PASSWORD=your_secure_password
DB_SECONDARY_SSL=true
DB_SECONDARY_TYPE=mysql

# Failover Configuration
FAILOVER_TIMEOUT_MS=30000
HEARTBEAT_INTERVAL_MS=10000
```

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Setup Database Schema
```bash
# Run on primary database
psql -h $DB_PRIMARY_HOST -U $DB_PRIMARY_USER -d $DB_PRIMARY_NAME -f schema.sql

# Run on secondary database (if MySQL)
mysql -h $DB_SECONDARY_HOST -u $DB_SECONDARY_USER -p $DB_SECONDARY_NAME < schema.sql
```

### 4. Start the Application
```bash
npm start
```

## API Endpoints

### Health Check
```http
GET /api/health
```

Returns system health status including database failover information:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "currentDB": "primary",
    "isReadOnly": false,
    "lastHeartbeat": 1704067200000,
    "uptime": 15000
  },
  "uptime": 300
}
```

### Portfolio (with failover support)
```http
GET /api/user/:address/portfolio
```

### Vaults (with failover support)
```http
GET /api/vaults?page=1&limit=20
```

## Testing

### Run Failover Tests
```bash
node test-failover.js
```

### Test Scenarios
1. **Initialization Test**: Verifies failover manager setup
2. **Heartbeat Test**: Confirms monitoring system works
3. **Read-Only Mode Test**: Validates write protection during failover
4. **Failover Timeout Test**: Simulates primary database failure
5. **API Endpoint Tests**: Tests all endpoints with failover

## Monitoring & Logging

### Console Logs
The system provides detailed logging for:
- ✅ Successful heartbeat checks with response times
- ❌ Failed heartbeat attempts
- 🔄 Failover events and recovery
- ⚠️ Warnings for degraded performance

### Health Monitoring
- Monitor `/api/health` endpoint
- Track database uptime metrics
- Alert on failover events
- Monitor response times

## Disaster Recovery Procedures

### Primary Database Outage
1. **Automatic Detection**: System detects failure within 30 seconds
2. **Automatic Failover**: Switches to secondary database
3. **Read-Only Mode**: Enters read-only to protect data consistency
4. **User Impact**: Investors can still view claims (read operations)

### Primary Database Recovery
1. **Automatic Detection**: Heartbeat detects recovery
2. **Automatic Switchback**: Returns to primary database
3. **Read-Write Mode**: Restores full functionality
4. **Data Sync**: Ensure data replication is current

### Manual Intervention
If automatic failover fails:
1. Check environment configuration
2. Verify secondary database connectivity
3. Review logs for error details
4. Manual restart if necessary

## Performance Considerations

### Connection Pooling
- Primary: 20 max connections
- Secondary: 20 max connections
- 30-second idle timeout
- 2-second connection timeout

### Response Time Targets
- Heartbeat: < 100ms
- Query operations: < 500ms
- Failover detection: 30 seconds
- Recovery: < 5 seconds

## Security

### Database Security
- SSL/TLS encryption for all connections
- Environment variable credential management
- Network security group configurations
- Regular password rotation

### Application Security
- Read-only mode during failover
- Input validation and sanitization
- Error handling without information leakage
- Audit logging for all operations

## Troubleshooting

### Common Issues

#### Failover Not Triggering
- Check environment variables
- Verify secondary database connectivity
- Review heartbeat interval settings

#### Connection Errors
- Validate SSL certificates
- Check network security groups
- Verify database credentials

#### Performance Issues
- Monitor connection pool usage
- Check database query performance
- Review network latency

### Debug Mode
Enable debug logging:
```bash
DEBUG=failover:* npm start
```

## Compliance & SLA

### Uptime Guarantee
- **Target**: 99.99% uptime
- **Failover Time**: < 30 seconds
- **Recovery Time**: < 5 seconds
- **Data Availability**: Read operations always available

### Financial Data Protection
- **Read-Only Failover**: Protects data integrity
- **Warm Standby**: Immediate availability
- **Heartbeat Monitoring**: Proactive failure detection
- **Automatic Recovery**: Minimizes downtime

## Future Enhancements

### Planned Features
- [ ] Multi-region database replication
- [ ] Load balancing for read operations
- [ ] Advanced monitoring dashboard
- [ ] Automated backup verification
- [ ] Database migration tools

### Scalability
- Horizontal scaling support
- Database sharding capability
- Caching layer integration
- Performance optimization

## Support

For issues related to the multi-cloud database failover system:
1. Check this documentation
2. Review system logs
3. Run diagnostic tests
4. Contact the development team

---

**Implementation Status**: ✅ Complete  
**Issue Resolution**: #116, #60  
**Last Updated**: 2024-01-01
