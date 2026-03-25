## Summary
Implements vesting "cliffs" on top-ups functionality, allowing vaults to add funds with independent cliff periods. When funds are added to an existing vault (top-up), a new cliff can be defined specifically for those new tokens using a SubSchedule system.

## Changes Made
- **Database Models**: 
  - `SubSchedule` model for managing multiple vesting schedules per vault
  - Each top-up creates its own sub-schedule with independent cliff configuration
  - Proper relationships and foreign key constraints
- **Database Migration**: SQL migration for vaults and sub_schedules tables with indexes
- **Backend Services**: 
  - `VestingService` with methods: `createVault()`, `topUpVault()`, `calculateReleasableAmount()`, `releaseTokens()`
  - `AdminService` integration for vault management operations
  - `IndexingService` updates for blockchain event processing
- **API Endpoints**:
  - `POST /api/vault/top-up` - Top-up vault with cliff configuration
  - `GET /api/vault/:vaultAddress/details` - Get vault with sub-schedules
  - `GET /api/vault/:vaultAddress/releasable` - Calculate releasable amount
  - `POST /api/vault/release` - Release tokens from vault
  - `POST /api/indexing/top-up` - Process top-up blockchain events
  - `POST /api/indexing/release` - Process release blockchain events
- **Testing**: Comprehensive test suite covering all vesting cliff functionality
- **Documentation**: Complete implementation documentation with API examples

## Key Features
- **Multiple Sub-Schedules**: Each top-up creates its own vesting schedule
- **Independent Cliffs**: Each sub-schedule can have its own cliff period
- **Pro-rata Releases**: Token releases are distributed proportionally across sub-schedules
- **Audit Trail**: All operations are logged for compliance
- **Blockchain Integration**: Indexing service handles on-chain events

## Acceptance Criteria
- ✅ **SubSchedule List**: Implemented SubSchedule model within Vault system
- ✅ **Complex Logic**: Handles multiple vesting schedules with independent cliffs
- ✅ **Stretch Goal**: Successfully implemented as complex feature with full functionality

## Testing
- Added comprehensive test suite in `backend/test/vesting-topup.test.js`
- Covers sub-schedule creation, cliff calculations, integration scenarios
- All tests passing

## Documentation
- Created detailed documentation in `VESTING_CLIFFS_IMPLEMENTATION.md`
- Includes API examples, usage patterns, and database schema
- Complete implementation reference

Closes #19
