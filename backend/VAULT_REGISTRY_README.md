# On-Chain Vesting Registry for Ecosystem Indexers

## Overview

This implementation creates a foundational piece for the Stellar ecosystem by making Vesting-Vault data discoverable by third-party portfolio trackers and DAO analytics tools. The "Registry Indexer" monitors the deployment of all new vault instances and maintains a global map of ContractID -> ProjectName.

## Features

### 🔍 **Ecosystem Discovery**
- **Public API**: `list_vaults_by_creator` returns an array of contract hashes for any creator
- **Meta-Dashboard Ready**: Enables dynamic pulling and display of all vesting activity on Stellar network
- **Transparent Public Utility**: No reliance on centralized off-chain databases

### 🚀 **Real-Time Indexing**
- **Automated Monitoring**: Continuously scans Stellar ledger for new vault deployments
- **Smart Contract Analysis**: Detects vault types (standard, cliff, dynamic) from deployment parameters
- **Metadata Extraction**: Captures project names, token addresses, and deployment details

### 📊 **Analytics & Insights**
- **Registry Statistics**: Total vaults, active vaults, unique creators, vault types
- **Search Functionality**: Find vaults by project name (partial matching)
- **Pagination Support**: Efficient handling of large datasets

## Architecture

### Core Components

#### 1. **VaultRegistry Model** (`src/models/vaultRegistry.js`)
```javascript
// Maintains global map of ContractID -> ProjectName
{
  contract_id: "Stellar contract address",
  project_name: "Human-readable project name",
  creator_address: "Vault creator address",
  deployment_ledger: "Ledger number of deployment",
  vault_type: "standard | cliff | dynamic",
  is_active: "Boolean status flag",
  metadata: "Additional JSON metadata"
}
```

#### 2. **VaultRegistryService** (`src/services/vaultRegistryService.js`)
- **Monitoring**: Scans Stellar ledger for new vault deployments
- **Registration**: Automatically registers discovered vaults
- **Querying**: Provides search and listing functionality
- **Analysis**: Extracts vault type and metadata from deployments

#### 3. **API Routes** (`src/routes/vaultRegistry.js`)
- `GET /api/registry/vaults/by-creator/{creatorAddress}` - List vaults by creator
- `GET /api/registry/vaults/search` - Search by project name
- `GET /api/registry/vaults` - Get all vaults (ecosystem analytics)
- `GET /api/registry/vaults/{contractId}` - Get specific vault details
- `GET /api/registry/stats` - Registry statistics

#### 4. **Indexing Job** (`src/jobs/vaultRegistryIndexingJob.js`)
- **Scheduled Execution**: Runs every 2 minutes
- **Ledger Processing**: Processes new ledgers since last run
- **Error Handling**: Robust error recovery and logging
- **Metrics**: Tracks indexing performance and statistics

## Installation & Setup

### 1. Database Migration
```bash
# Apply the vault registry migration
psql -d your_database -f migrations/017_create_vault_registry_table.sql
```

### 2. Environment Variables
```env
# Stellar network configuration
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=testnet

# Registry configuration
VAULT_REGISTRY_INDEXING_ENABLED=true
VAULT_REGISTRY_POLL_INTERVAL=120000  # 2 minutes in milliseconds
```

### 3. Start the Service
```bash
cd backend
npm install
npm run dev
```

The vault registry indexing job will start automatically and begin monitoring for new vault deployments.

## API Usage Examples

### List Vaults by Creator
```javascript
const response = await fetch('/api/registry/vaults/by-creator/GD1234567890abcdef?limit=10&offset=0');
const data = await response.json();

console.log(data.data.vaults);
// [
//   {
//     contract_id: "CA1234567890abcdef",
//     project_name: "Amazing DeFi Project",
//     creator_address: "GD1234567890abcdef",
//     vault_type: "standard",
//     deployment_ledger: 12345,
//     is_active: true
//   }
// ]
```

### Search Vault Registry
```javascript
const response = await fetch('/api/registry/vaults/search?projectName=DeFi&limit=5');
const data = await response.json();
```

### Get Registry Statistics
```javascript
const response = await fetch('/api/registry/stats');
const data = await response.json();

console.log(data.data);
// {
//   total_vaults: 150,
//   active_vaults: 142,
//   unique_creators: 89,
//   vaults_by_type: {
//     standard: 120,
//     cliff: 25,
//     dynamic: 5
//   },
//   recent_deployments: 12
// }
```

## Integration Guide

### For Portfolio Trackers

1. **Discover All Vaults**: Use `/api/registry/vaults` to get the complete list
2. **Monitor New Deployments**: Poll `/api/registry/stats` periodically for new vault counts
3. **Get Creator Portfolios**: Use `/api/registry/vaults/by-creator/{address}` for creator-specific data

### For DAO Analytics Tools

1. **Ecosystem Overview**: `/api/registry/stats` provides high-level metrics
2. **Trend Analysis**: Track `recent_deployments` over time
3. **Vault Type Distribution**: Analyze `vaults_by_type` for ecosystem insights

### For Meta-Dashboards

```javascript
// Example: Real-time vault discovery dashboard
async function updateVaultDashboard() {
  const stats = await fetch('/api/registry/stats').then(r => r.json());
  const recentVaults = await fetch('/api/registry/vaults?limit=10').then(r => r.json());
  
  updateDashboardUI({
    totalVaults: stats.data.total_vaults,
    activeVaults: stats.data.active_vaults,
    recentDeployments: recentVaults.data.vaults
  });
}

// Update every 30 seconds
setInterval(updateVaultDashboard, 30000);
```

## Smart Contract Detection

The registry automatically detects vault deployments by analyzing:

1. **Contract Creation Events**: Monitors `invokeHostFunction` operations
2. **WASM Hash Matching**: Identifies known vault contract patterns
3. **Parameter Analysis**: Extracts vault type from constructor parameters
4. **Memo Parsing**: Extracts project names from transaction memos

### Supported Vault Types

- **Standard**: Basic vesting vaults
- **Cliff**: Vaults with cliff periods
- **Dynamic**: Vaults for fee-on-transfer or rebase tokens

## Performance Considerations

### Indexing Performance
- **Batch Processing**: Processes ledgers in batches for efficiency
- **Parallel Operations**: Concurrent processing of multiple transactions
- **Caching**: Redis caching for frequently accessed data
- **Rate Limiting**: Respect Stellar Horizon API limits

### API Performance
- **Database Indexes**: Optimized indexes on all query fields
- **Pagination**: Prevents large result sets
- **Response Compression**: GZIP compression for API responses
- **CDN Ready**: Static assets can be cached

## Monitoring & Observability

### Health Checks
```bash
curl http://localhost:4000/health
# Returns: {"status":"OK","timestamp":"2024-03-26T01:27:00.000Z"}
```

### Indexing Status
The indexing job logs detailed information about:
- Ledgers processed per run
- New vaults discovered
- Processing duration
- Error rates

### Metrics Integration
The service emits metrics compatible with:
- Prometheus
- DataDog
- CloudWatch
- Custom monitoring systems

## Security Considerations

### Data Privacy
- **Public Data Only**: Only indexes publicly available blockchain data
- **No Sensitive Information**: Doesn't store private keys or sensitive data
- **Read-Only Operations**: No write operations to blockchain

### API Security
- **Rate Limiting**: Applied to all registry endpoints
- **Input Validation**: Comprehensive parameter validation
- **Error Handling**: Secure error responses without information leakage

## Testing

### Unit Tests
```bash
# Run vault registry tests
npm test -- vaultRegistry.test.js
```

### Integration Tests
```bash
# Test full indexing pipeline
npm run test:integration
```

### Load Testing
```bash
# Test API performance under load
npm run test:load
```

## Deployment

### Production Configuration
```env
NODE_ENV=production
STELLAR_HORIZON_URL=https://horizon.stellar.org
STELLAR_NETWORK=public
VAULT_REGISTRY_POLL_INTERVAL=60000  # 1 minute
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### Kubernetes
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vault-registry
spec:
  replicas: 3
  selector:
    matchLabels:
      app: vault-registry
  template:
    metadata:
      labels:
        app: vault-registry
    spec:
      containers:
      - name: vault-registry
        image: vesting-vault-backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: STELLAR_HORIZON_URL
          value: "https://horizon.stellar.org"
```

## Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit pull request

### Code Standards
- **ESLint**: Follow project linting rules
- **Prettier**: Consistent code formatting
- **TypeScript**: Type safety for new code
- **Documentation**: Update API docs for changes

## Roadmap

### Phase 1 ✅ (Current)
- [x] Basic vault registry
- [x] Creator-based listing
- [x] Search functionality
- [x] Statistics API

### Phase 2 (Planned)
- [ ] GraphQL integration
- [ ] WebSocket real-time updates
- [ ] Advanced filtering options
- [ ] Export functionality

### Phase 3 (Future)
- [ ] Cross-chain support
- [ ] Machine learning insights
- [ ] Advanced analytics
- [ ] Governance integration

## Support

### Documentation
- **API Docs**: `/api-docs` (Swagger UI)
- **Architecture Guide**: `ARCHITECTURE.md`
- **Deployment Guide**: `README-DEPLOYMENT.md`

### Issues & Support
- **GitHub Issues**: Report bugs and feature requests
- **Discord Community**: Get help from other developers
- **Documentation**: Comprehensive guides and examples

---

**This implementation transforms JerryIdoko's Vesting-Vault into a transparent public utility for the entire Stellar ecosystem, enabling unprecedented visibility and discoverability of vesting activity.**
