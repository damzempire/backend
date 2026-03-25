# TGE Load Testing

This directory contains load testing scripts designed to simulate Token Generation Event (TGE) scenarios where 1,000+ concurrent users might refresh their dashboards simultaneously.

## Prerequisites

1. Install Artillery globally:
```bash
npm install -g artillery
```

2. Install project dependencies:
```bash
npm install
```

3. Ensure your API server is running:
```bash
npm start
```

## Available Load Tests

### 1. Basic Load Test
- **Purpose**: Tests basic API endpoints without authentication
- **Duration**: ~10 minutes
- **Peak Load**: 500 RPS
- **Endpoints**: `/api/vaults`, `/health`

### 2. Comprehensive TGE Test
- **Purpose**: Full TGE scenario with authenticated users
- **Duration**: ~20 minutes
- **Peak Load**: 500 RPS sustained for 10 minutes
- **Endpoints**: Auth, vaults, portfolio, claims history

### 3. Quick Test
- **Purpose**: Quick validation test
- **Duration**: ~5 minutes
- **Peak Load**: 500 RPS
- **Endpoints**: Core API endpoints

## Running Tests

### Using npm scripts (recommended):

```bash
# Basic load test
npm run test:load:basic

# Comprehensive TGE test
npm run test:load:comprehensive

# Quick test
npm run test:load:quick

# Default (basic test)
npm run test:load
```

### Using the script directly:

```bash
# Basic test
node scripts/run-tge-load-test.js basic

# Comprehensive test
node scripts/run-tge-load-test.js comprehensive

# Quick test
node scripts/run-tge-load-test.js quick
```

### Using Artillery directly:

```bash
# Basic test
artillery run artillery-basic-load-test.yml

# Comprehensive test
artillery run artillery-tge-comprehensive.yml

# Quick test
artillery run artillery-tge-load-test.yml
```

## Environment Variables

- `API_BASE_URL`: Target API URL (default: `http://localhost:3000`)

Example:
```bash
API_BASE_URL=http://localhost:4000 npm run test:load
```

## Performance Targets

- **P99 Latency**: < 200ms (target)
- **P95 Latency**: < 100ms (ideal)
- **Error Rate**: < 1%
- **Throughput**: Maintain 500 RPS during peak load

## Test Scenarios

### Authenticated User Dashboard Refresh (60% weight)
- User login with signature
- Fetch vaults list
- Fetch individual vault details
- Fetch vault beneficiaries
- Simulate realistic user navigation patterns

### Portfolio and Claims History (25% weight)
- User authentication
- Fetch portfolio data
- Fetch claims history with pagination
- Simulate portfolio review behavior

### Public Data and Export Requests (10% weight)
- Health checks
- Public vault data
- Export summary requests
- Simulate public API usage

### Stress Test - Heavy API Calls (5% weight)
- Rapid succession of API calls
- Simulate aggressive user behavior
- Test system limits

## Results

After each test run:
1. HTML report is generated: `artillery-report.html`
2. JSON data is saved: `artillery-report.json`
3. Key metrics are displayed in the console

### Key Metrics to Monitor:
- **P99 Latency**: Should be < 200ms
- **P95 Latency**: Should be < 100ms
- **Error Rate**: Should be < 1%
- **RPS (Requests Per Second)**: Actual throughput
- **Response Time Distribution**: Identify slow endpoints

## Troubleshooting

### Common Issues:

1. **Artillery not found**:
   ```bash
   npm install -g artillery
   ```

2. **Connection refused**:
   - Ensure API server is running
   - Check API_BASE_URL environment variable

3. **High error rates**:
   - Check server logs
   - Verify database connections
   - Monitor resource usage

4. **Memory issues**:
   - Reduce arrival rate in test config
   - Monitor server memory usage
   - Check for memory leaks

## Customization

### Modifying Test Scenarios:
Edit the `.yml` files to adjust:
- `arrivalRate`: Requests per second
- `duration`: Test phase duration
- `weight`: Scenario probability
- Endpoints and request parameters

### Adding New Scenarios:
1. Define new scenario in the `.yml` file
2. Set appropriate weight
3. Add request flow with think times
4. Test with smaller loads first

## Production Considerations

- **Never run load tests against production without approval**
- **Use staging environment that mirrors production**
- **Monitor system resources during tests**
- **Have rollback plans ready**
- **Coordinate with team during test windows**

## Continuous Integration

These tests can be integrated into CI/CD pipelines:
```yaml
# Example GitHub Actions step
- name: Run Load Tests
  run: |
    npm install -g artillery
    npm run test:load:quick
```

## Support

For issues or questions:
1. Check Artillery documentation: https://artillery.io/docs/
2. Review test logs for specific errors
3. Monitor server logs during test execution
