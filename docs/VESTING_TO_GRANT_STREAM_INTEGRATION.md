# Vesting-to-Grant-Stream Integration API

## Overview

The Vesting-to-Grant-Stream Integration enables users to "Fund" grant stream projects directly from their unvested vault tokens. This feature creates a "Future Lien" system that allows beneficiaries to commit future vesting tokens to community grants, demonstrating the "Inter-Protocol Synergy" of JerryIdoko's unified SocialFi Stack.

## Architecture

### Core Components

1. **Future Lien System**: Database-backed tracking of future token commitments
2. **Grant Stream Management**: Project creation and funding tracking
3. **Release Processing**: Automated and manual token release mechanisms
4. **Contract Integration**: Stellar smart contract interactions for on-chain enforcement
5. **Validation Layer**: Comprehensive input validation and business logic enforcement

### Key Concepts

- **Future Lien**: A commitment of unvested tokens to be released to a grant over time
- **Grant Stream**: A project that can receive future token commitments
- **Release Types**: Linear, Milestone-based, or Immediate token releases
- **Vesting Integration**: Seamless connection with existing vesting schedules

## Database Schema

### Tables

#### `grant_streams`
Stores grant stream project information:
- Project details (name, description, owner)
- Funding targets and current amounts
- Active/inactive status

#### `future_liens`
Core table tracking token commitments:
- Vault and beneficiary addresses
- Grant stream relationship
- Committed and released amounts
- Vesting and release schedules
- Status tracking

#### `lien_releases`
Records actual token release events:
- Release amounts and timestamps
- Transaction details
- Vesting calculations at release time

#### `lien_milestones`
Defines milestone-based release schedules:
- Milestone names and descriptions
- Percentage allocations
- Completion tracking

## API Endpoints

### Future Lien Management

#### Create Future Lien
```http
POST /api/future-liens
Authorization: Bearer <token>
Content-Type: application/json

{
  "vault_address": "0x...",
  "beneficiary_address": "0x...",
  "grant_stream_id": 1,
  "committed_amount": 100.5,
  "release_start_date": "2024-01-01T00:00:00Z",
  "release_end_date": "2025-01-01T00:00:00Z",
  "release_rate_type": "linear",
  "milestones": [
    {
      "name": "Milestone 1",
      "percentage_of_total": 50,
      "target_date": "2024-06-01T00:00:00Z"
    }
  ],
  "transaction_hash": "0x..."
}
```

#### Get Beneficiary Liens
```http
GET /api/future-liens/beneficiary/{address}?status=active&include_inactive=false
Authorization: Bearer <token>
```

#### Get Vault Liens
```http
GET /api/future-liens/vault/{address}?status=pending
Authorization: Bearer <token>
```

#### Get Grant Stream Liens
```http
GET /api/future-liens/grant-stream/{id}
Authorization: Bearer <token>
```

#### Process Lien Release
```http
POST /api/future-liens/{id}/release
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 25.5,
  "milestone_id": 123,
  "transaction_hash": "0x...",
  "block_number": 12345
}
```

#### Cancel Future Lien
```http
POST /api/future-liens/{id}/cancel
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Project cancelled"
}
```

#### Get Active Lien Summary
```http
GET /api/future-liens/summary?vault_address=0x...&beneficiary_address=0x...
Authorization: Bearer <token>
```

### Grant Stream Management

#### Create Grant Stream
```http
POST /api/grant-streams
Authorization: Bearer <token>
Content-Type: application/json

{
  "address": "0x...",
  "name": "Community Grant Project",
  "description": "Funding for community development",
  "owner_address": "0x...",
  "token_address": "0x...",
  "target_amount": 10000,
  "end_date": "2025-12-31T23:59:59Z"
}
```

#### Get All Grant Streams
```http
GET /api/grant-streams
Authorization: Bearer <token>
```

#### Get Grant Stream Details
```http
GET /api/grant-streams/{id}
Authorization: Bearer <token>
```

### Calculator

#### Calculate Lien Impact
```http
GET /api/vesting-to-grant/calculator?vault_address=0x...&beneficiary_address=0x...&committed_amount=100&release_rate_type=linear&release_start_date=2024-01-01T00:00:00Z&release_end_date=2025-01-01T00:00:00Z
Authorization: Bearer <token>
```

## Release Types

### Linear Release
Tokens are released gradually over the release period based on time progression.

**Calculation**: `released_amount = committed_amount * (elapsed_time / total_duration)`

### Milestone Release
Tokens are released when predefined milestones are completed.

**Requirements**:
- At least one milestone
- Milestone percentages must sum to 100%
- Each milestone has a target date and percentage allocation

### Immediate Release
All committed tokens are released immediately when the release period starts.

## Background Processing

The system includes a background processor that automatically:

1. **Scans Active Liens**: Checks all active liens for potential releases
2. **Calculates Available Amounts**: Determines releasable tokens based on vesting
3. **Processes Releases**: Executes releases based on release type
4. **Updates Records**: Maintains accurate tracking of all releases

### Processor Configuration

```javascript
// Environment variables
LIEN_PROCESSING_INTERVAL_MS=60000  // Processing interval (1 minute)
ENABLE_CONTRACT_RELEASES=true      // Enable on-chain releases
PROCESSOR_PRIVATE_KEY=...          // Private key for contract interactions
```

### Processor Management

```javascript
const futureLienProcessorService = require('./src/services/futureLienProcessorService');

// Start processing
futureLienProcessorService.start();

// Stop processing
futureLienProcessorService.stop();

// Get processing stats
const stats = await futureLienProcessorService.getProcessingStats();

// Health check
const health = await futureLienProcessorService.healthCheck();
```

## Contract Integration

The system integrates with Stellar smart contracts for on-chain enforcement:

### Contract Functions

#### `create_future_lien`
Creates a future lien on-chain, locking tokens for future release.

#### `release_lien_tokens`
Releases tokens from a lien to the grant stream.

#### `cancel_future_lien`
Cancels a future lien and releases any locked tokens.

#### `get_lien_state`
Queries the current state of a future lien.

#### `get_available_release_amount`
Calculates the amount currently available for release.

### Contract Service Usage

```javascript
const futureLienContractService = require('./src/services/futureLienContractService');

// Create lien on-chain
const result = await futureLienContractService.createFutureLienOnChain({
  vaultAddress: '0x...',
  beneficiaryAddress: '0x...',
  grantStreamAddress: '0x...',
  committedAmount: 100000000, // In stroops
  releaseStartTime: 1704067200, // Unix timestamp
  releaseEndTime: 1735689599,
  releaseRateType: 'linear',
  signerPrivateKey: '...'
});

// Process release on-chain
const releaseResult = await futureLienContractService.processLienReleaseOnChain({
  lienId: 'lien_123',
  amount: 50000000, // In stroops
  signerPrivateKey: '...'
});
```

## Validation and Error Handling

### Input Validation

The system includes comprehensive validation:

- **Address Validation**: Ethereum address format checking
- **Amount Validation**: Positive amounts with precision limits
- **Date Validation**: ISO8601 format and logical date relationships
- **Business Logic Validation**: Allocation limits, status constraints, etc.

### Error Responses

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "committed_amount",
      "message": "Committed amount must be positive",
      "value": -100
    }
  ],
  "message": "Request validation failed. Please check your input parameters."
}
```

### Common Error Scenarios

1. **Vault Not Found**: Specified vault doesn't exist
2. **Beneficiary Not Found**: Beneficiary not in vault
3. **Grant Stream Inactive**: Grant stream is not accepting funds
4. **Insufficient Allocation**: Committed amount exceeds beneficiary allocation
5. **Invalid Release Period**: Release dates are invalid
6. **Lien Already Exists**: Duplicate lien for vault/beneficiary/grant combination
7. **Milestone Validation**: Milestone percentages don't sum to 100%

## Security Considerations

### Authentication
- All endpoints require JWT authentication
- User address is extracted from token for authorization

### Authorization
- Users can only create liens for their own beneficiary addresses
- Grant stream owners can manage their grant streams
- Admin addresses have elevated privileges

### Rate Limiting
- Wallet-based rate limiting applied to all API routes
- Additional rate limiting for sensitive operations

### Audit Logging
- All significant actions are logged to audit trail
- Includes user addresses, timestamps, and action details

## Testing

### Unit Tests
```bash
npm test -- test/futureLienService.test.js
```

### Integration Tests
```bash
npm test -- test/futureLienIntegration.test.js
```

### Test Coverage
The test suite covers:
- Lien creation and validation
- Release processing (all types)
- Lien cancellation
- Grant stream management
- API endpoint functionality
- Error scenarios

## Deployment

### Database Migration
Run the migration to create the required tables:

```sql
-- Migration file: 014_create_future_lien_tables.sql
```

### Environment Configuration
Required environment variables:

```bash
# Database
DB_HOST=localhost
DB_NAME=vesting_vault
DB_USER=postgres
DB_PASSWORD=password

# Stellar Integration
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
VESTING_VAULT_CONTRACT_ADDRESS=0x...
GRANT_STREAM_CONTRACT_ADDRESS=0x...
FUTURE_LIEN_CONTRACT_ADDRESS=0x...

# Processing
LIEN_PROCESSING_INTERVAL_MS=60000
ENABLE_CONTRACT_RELEASES=true
PROCESSOR_PRIVATE_KEY=...
```

### Service Startup
The background processor should be started with the main application:

```javascript
// In main application startup
const futureLienProcessorService = require('./src/services/futureLienProcessorService');
futureLienProcessorService.start();
```

## Monitoring and Analytics

### Key Metrics
- Total active liens
- Total committed tokens
- Total released tokens
- Release processing success rate
- Average processing time

### Health Endpoints
```http
GET /api/future-liens/processor/health
```

Returns processor status and statistics.

## Use Cases

### 1. Community Funding
A team member with 1000 tokens vesting over 2 years commits 200 tokens to a community grant, releasing 10% monthly over the grant period.

### 2. Milestone-Based Funding
An investor commits 500 tokens to a startup project, with releases tied to product development milestones.

### 3. Immediate Impact
A beneficiary commits 50 tokens to an emergency relief fund, releasing all tokens immediately.

### 4. Long-Term Support
A founder commits 10% of their vesting tokens to a foundation, releasing gradually over 5 years.

## Future Enhancements

### Planned Features
1. **Multi-Token Support**: Support for multiple token types
2. **Advanced Release Schedules**: Custom release algorithms
3. **Governance Integration**: DAO-based grant approval
4. **Cross-Chain Support**: Multi-blockchain compatibility
5. **Enhanced Analytics**: Advanced reporting and insights

### Scalability Improvements
1. **Sharding**: Horizontal scaling for large deployments
2. **Caching**: Redis-based caching for frequently accessed data
3. **Queue Processing**: Background job queuing for releases
4. **Microservices**: Service decomposition for better scalability

## Support and Contributing

### Getting Help
- Review the API documentation above
- Check the test files for usage examples
- Examine the validation middleware for requirements

### Contributing
1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Bug Reports
Please report bugs through the project's issue tracker with:
- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details

## License

This integration is part of the broader Vesting Vault ecosystem and follows the same licensing terms as the main project.
