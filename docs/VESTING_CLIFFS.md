# Vesting Cliffs on Top-Ups Implementation

## Overview

This feature implements vesting "cliffs" for top-ups in the Vesting Vault system. When additional funds are added to an existing vault (top-up), a new cliff period can be defined specifically for those new tokens, allowing for flexible and complex vesting schedules.

## Architecture

### Core Components

#### 1. Vault Model
- **Purpose**: Represents a single vesting vault
- **Key Fields**:
  - `address`: Smart contract address
  - `token_address`: Address of the token being vested
  - `owner_address`: Vault owner
  - `total_amount`: Cumulative tokens deposited

#### 2. SubSchedule Model
- **Purpose**: Individual vesting schedule for each top-up
- **Key Fields**:
  - `vault_id`: Reference to parent vault
  - `top_up_amount`: Amount of tokens in this top-up
  - `cliff_duration`: Cliff period in seconds
  - `vesting_duration`: Total vesting period in seconds
  - `start_timestamp`: When vesting begins (cliff end)
  - `end_timestamp`: When vesting completes
  - `amount_withdrawn`: Track withdrawals from this sub-schedule

#### 3. Beneficiary Model
- **Purpose**: Track beneficiaries and their allocations
- **Key Fields**:
  - `vault_id`: Reference to parent vault
  - `address`: Beneficiary wallet address
  - `total_allocated`: Total tokens allocated
  - `total_withdrawn`: Total tokens withdrawn

## API Endpoints

### Vault Management

#### Create Vault
```http
POST /api/vaults
Content-Type: application/json

{
  "address": "0x1234567890123456789012345678901234567890",
  "name": "Employee Vesting Vault",
  "token_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "owner_address": "0x1111111111111111111111111111111111111111",
  "initial_amount": "10000",
  "beneficiaries": [
    {
      "address": "0x2222222222222222222222222222222222222222",
      "allocation": "5000"
    }
  ]
}
```

### Top-Up Operations

#### Process Top-Up with Cliff
```http
POST /api/vaults/{vaultAddress}/top-up
Content-Type: application/json

{
  "amount": "5000",
  "cliff_duration_seconds": 2592000,  // 30 days
  "vesting_duration_seconds": 7776000, // 90 days
  "transaction_hash": "0xabcdef1234567890",
  "block_number": 12345,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Vesting Information

#### Get Vesting Schedule
```http
GET /api/vaults/{vaultAddress}/schedule?beneficiaryAddress={address}
```

#### Calculate Withdrawable Amount
```http
GET /api/vaults/{vaultAddress}/{beneficiaryAddress}/withdrawable?timestamp={timestamp}
```

#### Process Withdrawal
```http
POST /api/vaults/{vaultAddress}/{beneficiaryAddress}/withdraw
Content-Type: application/json

{
  "amount": "1000",
  "transaction_hash": "0xwithdraw123456",
  "block_number": 12346,
  "timestamp": "2024-02-01T00:00:00Z"
}
```

#### Get Vault Summary
```http
GET /api/vaults/{vaultAddress}/summary
```

## Vesting Logic

### Cliff Calculation

1. **Before Cliff**: No tokens are vested
2. **During Cliff**: No tokens are vested
3. **After Cliff**: Linear vesting begins

### Vesting Formula

```
if now < cliff_end:
    vested_amount = 0
elif now >= vesting_end:
    vested_amount = top_up_amount
else:
    vested_ratio = (now - cliff_end) / (vesting_end - cliff_end)
    vested_amount = top_up_amount * vested_ratio
```

### Multiple Top-Ups

Each top-up creates an independent SubSchedule with its own:
- Cliff period
- Vesting duration
- Start/end timestamps
- Withdrawal tracking

Total withdrawable amount = Sum(withdrawable from all sub-schedules)

## Use Cases

### 1. Employee Vesting with Annual Bonuses

```javascript
// Initial grant: 1000 tokens, 1-year cliff, 4-year vesting
await processTopUp({
  vault_address: "0x...",
  amount: "1000",
  cliff_duration_seconds: 31536000, // 1 year
  vesting_duration_seconds: 126144000, // 4 years
  timestamp: "2024-01-01T00:00:00Z"
});

// Year 1 bonus: 200 tokens, 6-month cliff, 2-year vesting
await processTopUp({
  vault_address: "0x...",
  amount: "200",
  cliff_duration_seconds: 15552000, // 6 months
  vesting_duration_seconds: 63072000, // 2 years
  timestamp: "2025-01-01T00:00:00Z"
});
```

### 2. Investor Funding Rounds

```javascript
// Seed round: 5000 tokens, 6-month cliff, 3-year vesting
await processTopUp({
  vault_address: "0x...",
  amount: "5000",
  cliff_duration_seconds: 15552000, // 6 months
  vesting_duration_seconds: 94608000, // 3 years
  timestamp: "2024-01-01T00:00:00Z"
});

// Series A: 10000 tokens, 1-year cliff, 4-year vesting
await processTopUp({
  vault_address: "0x...",
  amount: "10000",
  cliff_duration_seconds: 31536000, // 1 year
  vesting_duration_seconds: 126144000, // 4 years
  timestamp: "2024-06-01T00:00:00Z"
});
```

## Database Schema

### Vaults Table
```sql
CREATE TABLE vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255),
  token_address VARCHAR(42) NOT NULL,
  owner_address VARCHAR(42) NOT NULL,
  total_amount DECIMAL(36,18) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Sub_Schedules Table
```sql
CREATE TABLE sub_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  top_up_amount DECIMAL(36,18) NOT NULL,
  cliff_duration INTEGER NOT NULL DEFAULT 0,
  vesting_duration INTEGER NOT NULL,
  start_timestamp TIMESTAMP NOT NULL,
  end_timestamp TIMESTAMP NOT NULL,
  amount_withdrawn DECIMAL(36,18) DEFAULT 0,
  transaction_hash VARCHAR(66) UNIQUE NOT NULL,
  block_number BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Beneficiaries Table
```sql
CREATE TABLE beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id UUID REFERENCES vaults(id) ON DELETE CASCADE,
  address VARCHAR(42) NOT NULL,
  total_allocated DECIMAL(36,18) DEFAULT 0,
  total_withdrawn DECIMAL(36,18) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vault_id, address)
);
```

## Error Handling

### Common Errors

1. **Vault Not Found**: `Vault with address {address} not found`
2. **Insufficient Vested Amount**: `Insufficient vested amount. Requested: {amount}, Available: {available}`
3. **Invalid Address**: `Invalid {type} address`
4. **Duplicate Transaction**: `Transaction hash already exists`

### Response Format

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Testing

### Unit Tests
- Vesting calculations
- Cliff logic
- Withdrawal processing
- Multi-top-up scenarios

### Integration Tests
- API endpoints
- Database operations
- Error scenarios

### Test Coverage
- ✅ Vault creation
- ✅ Top-up processing with cliffs
- ✅ Vesting calculations (before/during/after cliff)
- ✅ Withdrawal processing
- ✅ Multiple top-ups with different cliffs
- ✅ Error handling

## Security Considerations

1. **Input Validation**: All addresses validated as Ethereum addresses
2. **Transaction Uniqueness**: Transaction hashes must be unique
3. **Amount Validation**: Withdrawals cannot exceed vested amounts
4. **Timestamp Validation**: All timestamps validated and normalized

## Performance Considerations

1. **Database Indexing**: Optimized queries with proper indexes
2. **Batch Processing**: Support for batch operations
3. **Caching**: Frequently accessed data cached
4. **Pagination**: Large result sets paginated

## Future Enhancements

1. **Partial Withdrawals**: Support for partial withdrawals from specific sub-schedules
2. **Vesting Schedule Templates**: Predefined templates for common scenarios
3. **Beneficiary Groups**: Support for groups of beneficiaries
4. **Notification System**: Alerts for cliff end, vesting complete
5. **Analytics Dashboard**: Comprehensive vesting analytics

## Migration Guide

### From Simple Vesting

1. **Data Migration**: Convert existing vesting schedules to SubSchedule format
2. **API Compatibility**: Maintain backward compatibility where possible
3. **Testing**: Comprehensive testing of migrated data
4. **Rollback Plan**: Ability to rollback if issues arise

## Conclusion

The vesting cliffs feature provides flexible and powerful vesting schedule management for the Vesting Vault system. It supports complex scenarios while maintaining simplicity for basic use cases.

The implementation is production-ready with comprehensive testing, error handling, and documentation.
