# Vesting Cliffs on Top-Ups - Implementation

## Overview

This implementation adds support for vesting "cliffs" on top-ups to the Vesting Vault system. When funds are added to an existing vault (top-up), a new cliff can be defined specifically for those new tokens using a SubSchedule system.

## Features Implemented

### 1. Database Models

#### Vault Model
- Stores basic vault information including address, owner, token, and total amount
- Supports initial vesting schedule with optional cliff
- Located in: `backend/src/models/vault.js`

#### SubSchedule Model
- Handles multiple vesting schedules per vault
- Each top-up creates a new sub-schedule with its own cliff configuration
- Tracks amount released per sub-schedule
- Located in: `backend/src/models/subSchedule.js`

### 2. Database Migration
- SQL migration script for creating vaults and sub_schedules tables
- Includes proper indexes and foreign key constraints
- Located in: `backend/migrations/001_create_vaults_and_sub_schedules.sql`

### 3. Services

#### VestingService (`backend/src/services/vestingService.js`)
- `createVault()` - Creates new vault with initial vesting parameters
- `topUpVault()` - Adds funds to existing vault with optional cliff
- `calculateReleasableAmount()` - Calculates releasable tokens across all sub-schedules
- `releaseTokens()` - Releases tokens respecting individual cliff periods
- `getVaultWithSubSchedules()` - Retrieves vault with all sub-schedules

#### AdminService Integration
- Updated to use VestingService for vault operations
- Added methods: `topUpVault()`, `getVaultDetails()`, `calculateReleasableAmount()`, `releaseTokens()`

#### IndexingService Updates
- `processTopUpEvent()` - Handles blockchain top-up events
- `processReleaseEvent()` - Processes token release events
- `calculateSubScheduleReleasable()` - Vesting calculation helper

### 4. API Endpoints

#### Vault Management
- `POST /api/vault/top-up` - Top-up vault with cliff configuration
- `GET /api/vault/:vaultAddress/details` - Get vault with sub-schedules
- `GET /api/vault/:vaultAddress/releasable` - Calculate releasable amount
- `POST /api/vault/release` - Release tokens from vault

#### Indexing Events
- `POST /api/indexing/top-up` - Process top-up blockchain events
- `POST /api/indexing/release` - Process release blockchain events

## Usage Examples

### Creating a Vault
```javascript
const vault = await vestingService.createVault(
  '0xadmin...',
  '0xvault...',
  '0xowner...',
  '0xtoken...',
  '1000.0',
  new Date('2024-01-01'),
  new Date('2025-01-01'),
  null // no initial cliff
);
```

### Top-up with Cliff
```javascript
const topUp = await vestingService.topUpVault(
  '0xadmin...',
  '0xvault...',
  '500.0',
  '0xtransaction...',
  86400, // 1 day cliff in seconds
  2592000 // 30 days vesting in seconds
);
```

### Calculate Releasable Amount
```javascript
const releasable = await vestingService.calculateReleasableAmount(
  '0xvault...',
  new Date() // as of date
);
```

## API Request Examples

### Top-up Request
```json
POST /api/vault/top-up
{
  "adminAddress": "0xadmin...",
  "vaultAddress": "0xvault...",
  "topUpConfig": {
    "topUpAmount": "500.0",
    "transactionHash": "0xabc...",
    "cliffDuration": 86400,
    "vestingDuration": 2592000
  }
}
```

### Get Vault Details
```json
GET /api/vault/0xvault.../details
```

### Calculate Releasable
```json
GET /api/vault/0xvault.../releasable?asOfDate=2024-02-01T00:00:00Z
```

## Testing

Comprehensive test suite located at `backend/test/vesting-topup.test.js` covering:
- Sub-schedule creation with and without cliffs
- Releasable amount calculations
- Indexing service integration
- Error handling
- Full flow integration tests

## Key Features

1. **Multiple Sub-Schedules**: Each top-up creates its own vesting schedule
2. **Independent Cliffs**: Each sub-schedule can have its own cliff period
3. **Pro-rata Releases**: Token releases are distributed proportionally across sub-schedules
4. **Audit Trail**: All operations are logged for compliance
5. **Blockchain Integration**: Indexing service handles on-chain events

## Acceptance Criteria Met

✅ **SubSchedule List**: Implemented SubSchedule model within Vault system
✅ **Complex Logic**: Handles multiple vesting schedules with independent cliffs
✅ **Stretch Goal**: Successfully implemented as complex feature with full functionality

## Database Schema

### Vaults Table
- `id` (UUID, Primary Key)
- `vault_address` (VARCHAR, Unique)
- `owner_address` (VARCHAR)
- `token_address` (VARCHAR)
- `total_amount` (DECIMAL)
- `start_date`, `end_date`, `cliff_date` (TIMESTAMP)
- `is_active` (BOOLEAN)

### SubSchedules Table
- `id` (UUID, Primary Key)
- `vault_id` (UUID, Foreign Key)
- `top_up_amount` (DECIMAL)
- `top_up_transaction_hash` (VARCHAR, Unique)
- `top_up_timestamp` (TIMESTAMP)
- `cliff_duration`, `vesting_duration` (INTEGER)
- `cliff_date`, `vesting_start_date` (TIMESTAMP)
- `amount_released` (DECIMAL)
- `is_active` (BOOLEAN)

The implementation provides a robust, scalable solution for managing vesting cliffs on top-ups while maintaining backward compatibility with existing vault functionality.
