# Gas Refund Incentive for Storage Cleanup - Testing Guide

## Overview

This document provides step-by-step instructions to test and validate the "Gas Refund Incentive for Storage Cleanup" feature implementation. This feature rewards users for closing empty vaults after their 4-year vesting period completes, returning a portion of the platform fee as a "bounty reward."

---

## Table of Contents

1. [prerequisites](#prerequisites)
2. [Phase 1: Setup & Initialization](#phase-1-setup--initialization)
3. [Phase 2: Vault Eligibility Testing](#phase-2-vault-eligibility-testing)
4. [Phase 3: Cleanup Task Creation](#phase-3-cleanup-task-creation)
5. [Phase 4: Reward Claiming](#phase-4-reward-claiming)
6. [Phase 5: Dashboard Integration Testing](#phase-5-dashboard-integration-testing)
7. [Phase 6: Smart Contract Testing](#phase-6-smart-contract-testing)
8. [Phase 7: Production Readiness](#phase-7-production-readiness)

---

## Prerequisites

### Required Tools
- Docker & Docker Compose (v2.0+)
- Node.js (v18+)
- PostgreSQL client tools
- Stellar CLI tools or soroban-cli
- Postman or curl

### Environment Setup

1. **Start Services**:
   ```bash
   cd /home/gamp/backend
   docker-compose up -d
   ```

2. **Verify Services**:
   ```bash
   # Check backend health
   curl http://localhost:3000/health
   
   # Check database
   docker-compose exec db psql -U postgres -d vesting_vault -c "SELECT version();"
   
   # Check Redis
   docker-compose exec redis redis-cli PING
   ```

3. **Install Dependencies**:
   ```bash
   cd /home/gamp/backend/backend
   npm install
   ```

4. **Run Migrations**:
   ```bash
   npm run migrate
   ```

---

## Phase 1: Setup & Initialization

### 1.1 Verify Database Tables Created

```bash
# Connect to database
docker-compose exec db psql -U postgres -d vesting_vault

# Check cleanup tables exist
\dt cleanup_tasks
\dt cleanup_rewards

# Verify indexes
\di cleanup_tasks_*
\di cleanup_rewards_*
```

**Expected Output**: Tables and indexes should exist with proper constraints.

### 1.2 Verify Smart Contract

```bash
# Check contract compilation
cd /home/gamp/backend/contracts/vesting-vault
cargo test

# Verify finalize_and_delete function exists
grep -n "finalize_and_delete" src/lib.rs
```

**Expected Output**: Contract should compile without errors, and function should be present.

### 1.3 Verify API Routes

```bash
# Check routes are registered
curl http://localhost:3000/api/cleanup/stats

# Expected response
{
  "success": true,
  "data": {
    "totalTasks": 0,
    "taskStatus": {
      "pending": 0,
      "claimed": 0,
      "cancelled": 0
    },
    "rewards": {...}
  }
}
```

---

## Phase 2: Vault Eligibility Testing

### 2.1 Create Test Vault

```bash
# Create a vault with 4-year vesting
VAULT_ADDRESS="0x1234567890123456789012345678901234567890"
OWNER_ADDRESS="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
TOKEN_ADDRESS="0x1111111111111111111111111111111111111111"
TOTAL_AMOUNT="1000.00"

curl -X POST http://localhost:3000/api/vaults \
  -H "Content-Type: application/json" \
  -d '{
    "address": "'$VAULT_ADDRESS'",
    "name": "Test Vesting Vault",
    "token_address": "'$TOKEN_ADDRESS'",
    "owner_address": "'$OWNER_ADDRESS'",
    "total_amount": "'$TOTAL_AMOUNT'",
    "beneficiaries": [{
      "address": "0x2222222222222222222222222222222222222222",
      "allocation": "1000.00"
    }]
  }'
```

### 2.2 Add Top-Up with Vesting Schedule

```bash
# Top-up with 4-year vesting
CLIFF_DURATION=$((365 * 24 * 3600))  # 1 year
VESTING_DURATION=$((4 * 365 * 24 * 3600))  # 4 years

curl -X POST http://localhost:3000/api/vaults/$VAULT_ADDRESS/top-up \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1000.00",
    "cliff_duration_seconds": '$CLIFF_DURATION',
    "vesting_duration_seconds": '$VESTING_DURATION',
    "transaction_hash": "0xabc123",
    "block_number": 1,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'
```

### 2.3 Check Eligibility (Before Vesting Complete)

```bash
# Should fail - vesting not complete
curl -X POST http://localhost:3000/api/cleanup/check-eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "vault_address": "'$VAULT_ADDRESS'"
  }'

# Expected response
{
  "success": true,
  "data": {
    "isEligible": false,
    "reason": "Vesting not yet complete. Next completion date: ...",
    "vestingComplete": false
  }
}
```

### 2.4 Simulate Vesting Completion

```sql
-- Update subschedule end_timestamp to now
docker-compose exec db psql -U postgres -d vesting_vault -c "
UPDATE sub_schedules 
SET end_timestamp = NOW() 
WHERE vault_id IN (
  SELECT id FROM vaults WHERE address = '0x1234567890123456789012345678901234567890'
);"
```

### 2.5 Check Eligibility (After Vesting Complete)

```bash
# Process withdrawal to claim all tokens
BENEFICIARY="0x2222222222222222222222222222222222222222"

curl -X POST \
  http://localhost:3000/api/vaults/$VAULT_ADDRESS/$BENEFICIARY/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1000.00",
    "transaction_hash": "0xwithdraw123",
    "block_number": 2,
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  }'

# Now check eligibility - should be true
curl -X POST http://localhost:3000/api/cleanup/check-eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "vault_address": "'$VAULT_ADDRESS'"
  }'

# Expected response
{
  "success": true,
  "data": {
    "isEligible": true,
    "reason": "Vault is eligible for cleanup reward",
    "vestingComplete": true
  }
}
```

---

## Phase 3: Cleanup Task Creation

### 3.1 Create Cleanup Task

```bash
PLATFORM_FEE="50.00"  # Platform fee paid for vault
BOUNTY_PERCENTAGE=10  # 10% bounty

curl -X POST http://localhost:3000/api/cleanup/create-task \
  -H "Content-Type: application/json" \
  -d '{
    "vault_address": "'$VAULT_ADDRESS'",
    "platform_fee_paid": "'$PLATFORM_FEE'",
    "bounty_percentage": '$BOUNTY_PERCENTAGE',
    "admin_address": "0xadmin123"
  }'

# Expected response
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "vault_address": "0x123...",
    "owner_address": "0xabc...",
    "bounty_reward_amount": "5.00",
    "bounty_percentage": 10,
    "status": "pending",
    "created_at": "2024-03-26T..."
  },
  "message": "Cleanup task created. Bounty reward: 5.00"
}
```

**Validation**:
- `bounty_reward_amount` should equal `platform_fee_paid * bounty_percentage / 100`
- Task status should be "pending"
- Task should be recorded in database

### 3.2 Verify Task in Database

```sql
docker-compose exec db psql -U postgres -d vesting_vault -c "
SELECT id, vault_address, owner_address, bounty_reward_amount, 
       bounty_percentage, status 
FROM cleanup_tasks 
WHERE vault_address = '0x1234567890123456789012345678901234567890';"
```

---

## Phase 4: Reward Claiming

### 4.1 Get Available Rewards

```bash
curl http://localhost:3000/api/cleanup/available-rewards/$OWNER_ADDRESS \
  -H "Content-Type: application/json"

# Expected response
{
  "success": true,
  "data": {
    "user_address": "0xabc...",
    "total_available_rewards": "5.00",
    "reward_count": 1,
    "rewards": [{
      "id": "uuid-...",
      "vault_address": "0x123...",
      "bounty_reward_amount": "5.00",
      "bounty_percentage": 10,
      "vesting_completion_date": "...",
      "status": "pending",
      "created_at": "..."
    }]
  }
}
```

### 4.2 Claim Reward

```bash
CLEANUP_TASK_ID="uuid-from-previous-response"
CLAIMER_ADDRESS=$OWNER_ADDRESS
TRANSACTION_HASH="0xfinal123"

curl -X POST http://localhost:3000/api/cleanup/claim-reward \
  -H "Content-Type: application/json" \
  -d '{
    "cleanup_task_id": "'$CLEANUP_TASK_ID'",
    "claimer_address": "'$CLAIMER_ADDRESS'",
    "transaction_hash": "'$TRANSACTION_HASH'",
    "ledger_sequence": 12345678
  }'

# Expected response
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "cleanup_task_id": "uuid-...",
    "claimer_address": "0xabc...",
    "reward_amount": "5.00",
    "transaction_hash": "0xfinal123",
    "reward_status": "pending",
    "claimed_at": "2024-03-26T..."
  },
  "message": "Cleanup reward claimed successfully! Amount: 5.00"
}
```

### 4.3 Verify Claim in Database

```sql
docker-compose exec db psql -U postgres -d vesting_vault -c "
SELECT id, claimer_address, reward_amount, reward_status, 
       claimed_at, transaction_hash 
FROM cleanup_rewards 
WHERE cleanup_task_id = 'uuid-from-above';"

-- Verify cleanup task status updated to 'claimed'
SELECT id, status, claimed_by_address, claimed_at 
FROM cleanup_tasks 
WHERE id = 'uuid-from-above';"
```

### 4.4 Update Reward Status

```bash
# Simulate blockchain confirmation
curl -X PATCH http://localhost:3000/api/cleanup/reward-status \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_hash": "'$TRANSACTION_HASH'",
    "status": "confirmed",
    "ledger_sequence": 12345678
  }'

# Expected response
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "transaction_hash": "0xfinal123",
    "reward_status": "confirmed",
    "ledger_sequence": 12345678,
    "updated_at": "2024-03-26T..."
  },
  "message": "Reward status updated to: confirmed"
}
```

---

## Phase 5: Dashboard Integration Testing

### 5.1 Get Cleanup Statistics

```bash
curl http://localhost:3000/api/cleanup/stats

# Expected response
{
  "success": true,
  "data": {
    "totalTasks": 1,
    "taskStatus": {
      "pending": 0,
      "claimed": 1,
      "cancelled": 0
    },
    "rewards": {
      "totalDistributed": "5.00",
      "confirmedCount": 1
    },
    "topClaimers": [
      {
        "claimer_address": "0xabc...",
        "claim_count": "1",
        "total_claimed": "5.00"
      }
    ],
    "message": "Total cleanup tasks: 1, Pending: 0, Claimed: 1"
  }
}
```

### 5.2 Get Task Details

```bash
curl http://localhost:3000/api/cleanup/task/$CLEANUP_TASK_ID

# Expected response includes full task details with vault info
{
  "success": true,
  "data": {
    "id": "uuid-...",
    "vault_address": "0x123...",
    "owner_address": "0xabc...",
    "status": "claimed",
    "claimed_by_address": "0xabc...",
    "bounty_reward_amount": "5.00",
    "vault": {
      "address": "0x123...",
      "name": "Test Vesting Vault",
      "token_address": "0x111...",
      "total_amount": "1000.00"
    }
  }
}
```

### 5.3 Filter By Status

```bash
# Get all pending cleanup rewards
curl "http://localhost:3000/api/cleanup/available-rewards/$OWNER_ADDRESS?status=pending"

# Get claimed rewards
curl "http://localhost:3000/api/cleanup/available-rewards/$OWNER_ADDRESS?status=claimed"
```

---

## Phase 6: Smart Contract Testing

### 6.1 Compile Smart Contract

```bash
cd /home/gamp/backend/contracts/vesting-vault
cargo build --target wasm32-unknown-unknown --release
```

**Expected**: No compilation errors, WASM binary produced.

### 6.2 Unit Tests

```bash
# Run tests with coverage
cargo test --all-features

# Test finalize_and_delete specifically
cargo test test_finalize_and_delete -- --nocapture
```

**Expected Tests to Pass**:
- `test_finalize_and_delete_success` - Vault properly deleted
- `test_finalize_and_delete_not_empty` - Rejects non-empty vaults
- `test_finalize_and_delete_vesting_incomplete` - Rejects active vesting
- `test_cleanup_reward_calculation` - Bounty calculated correctly
- `test_set_cleanup_reward` - Reward configuration stored

### 6.3 Test Contract Scenarios

**Scenario A: Successful Cleanup**
```bash
# 1. Create vault
# 2. Add tokens (1000)
# 3. Claim all tokens
# 4. Call finalize_and_delete
# Expected: Vault deleted, bounty returned, cleaning reward info

# Verification:
# - Vault entry removed from storage
# - Cleanup reward returned
# - Ledger entry cleaned up
```

**Scenario B: Incomplete Vesting**
```bash
# 1. Create vault with 4-year vesting
# 2. Call finalize_and_delete before end date
# Expected: Transaction fails with "vesting period not yet complete"
```

**Scenario C: Non-Empty Vault**
```bash
# 1. Create vault with 1000 tokens
# 2. Claim only 500 tokens
# 3. Call finalize_and_delete
# Expected: Transaction fails with "vault is not empty"
```

---

## Phase 7: Production Readiness

### 7.1 Data Consistency Checks

```sql
-- Verify no orphaned cleanup tasks
SELECT ct.id, ct.vault_address 
FROM cleanup_tasks ct
LEFT JOIN vaults v ON ct.vault_id = v.id
WHERE v.id IS NULL;

-- Should return: 0 rows

-- Verify no orphaned cleanup rewards
SELECT cr.id, cr.cleanup_task_id
FROM cleanup_rewards cr
LEFT JOIN cleanup_tasks ct ON cr.cleanup_task_id = ct.id
WHERE ct.id IS NULL;

-- Should return: 0 rows

-- Verify bounty calculations are correct
SELECT 
  ct.id,
  ct.bounty_reward_amount,
  ct.platform_fee_paid,
  ct.bounty_percentage,
  ROUND((ct.platform_fee_paid * ct.bounty_percentage / 100)::NUMERIC, 18) as expected_amount,
  CASE WHEN ct.bounty_reward_amount = ROUND((ct.platform_fee_paid * ct.bounty_percentage / 100)::NUMERIC, 18) 
    THEN 'OK' ELSE 'MISMATCH' END as validation
FROM cleanup_tasks
ORDER BY ct.created_at DESC LIMIT 10;
```

### 7.2 Performance Testing

```bash
# Test with 1000 cleanup tasks
for i in {1..1000}; do
  curl -X POST http://localhost:3000/api/cleanup/stats \
    -H "Content-Type: application/json"
done

# Measure response time
time curl http://localhost:3000/api/cleanup/stats

# Expected: < 500ms response time
```

### 7.3 Error Handling Tests

```bash
# Test missing required fields
curl -X POST http://localhost:3000/api/cleanup/create-task \
  -H "Content-Type: application/json" \
  -d '{"vault_address": "0x123"}'

# Expected: 400 Bad Request with error message

# Test invalid vault address
curl -X POST http://localhost:3000/api/cleanup/check-eligibility \
  -H "Content-Type: application/json" \
  -d '{
    "vault_address": "INVALID_ADDRESS"
  }'

# Expected: 500 or 400 error

# Test claiming non-existent task
curl -X POST http://localhost:3000/api/cleanup/claim-reward \
  -H "Content-Type: application/json" \
  -d '{
    "cleanup_task_id": "invalid-uuid",
    "claimer_address": "0x123",
    "transaction_hash": "0xabc"
  }'

# Expected: 400 Bad Request
```

### 7.4 Security Checks

```bash
# Verify SQL injection protection
curl -X POST http://localhost:3000/api/cleanup/claim-reward \
  -H "Content-Type: application/json" \
  -d '{
    "cleanup_task_id": "'; DROP TABLE cleanup_tasks; --",
    "claimer_address": "0x123",
    "transaction_hash": "0xabc"
  }'

# Expected: Database should remain intact

# Test concurrent reward claims (race condition prevention)
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/cleanup/claim-reward \
    -H "Content-Type: application/json" \
    -d '{
      "cleanup_task_id": "'$CLEANUP_TASK_ID'",
      "claimer_address": "'$CLAIMER_ADDRESS'",
      "transaction_hash": "0xrace'$i'"
    }' &
done

wait

# Expected: Only one claim succeeds, others fail with "already claimed" error
```

### 7.5 Logging & Monitoring

```bash
# Check audit logs
curl http://localhost:3000/api/admin/audit-logs?limit=50 | \
  grep -i "cleanup"

# Expected: All cleanup operations recorded with:
# - Action type (CREATE_CLEANUP_TASK, CLAIM_CLEANUP_REWARD, etc.)
# - User address
# - Vault address
# - Timestamp
# - Result (success/failure)

# Monitor service logs
docker-compose logs -f backend | grep -i cleanup

# Expected: No errors, warnings only if expected
```

---

## Test Completion Checklist

- [ ] All API endpoints respond correctly
- [ ] Database tables created with proper constraints
- [ ] Eligibility checks work for all vault states
- [ ] Cleanup tasks created with correct bounty calculations
- [ ] Reward claiming process works end-to-end
- [ ] Dashboard statistics accurate
- [ ] Smart contract compiles and passes unit tests
- [ ] finalize_and_delete function behaves correctly
- [ ] All error scenarios handled gracefully
- [ ] No SQL injection vulnerabilities
- [ ] Race conditions prevented (concurrent claims)
- [ ] Audit logs record all operations
- [ ] Performance meets requirements (< 500ms response)
- [ ] Data consistency verified in database

---

## Troubleshooting

### Issue: "Vault not found"
**Solution**: Ensure vault exists before creating cleanup task. Run:
```bash
curl http://localhost:3000/api/vaults/$VAULT_ADDRESS/schedule
```

### Issue: "Vault not empty. Remaining balance"
**Solution**: Claim all remaining tokens first:
```bash
curl -X POST \
  http://localhost:3000/api/vaults/$VAULT_ADDRESS/$BENEFICIARY/withdraw \
  -H "Content-Type: application/json" \
  -d '{"amount": "REMAINING_BALANCE", "transaction_hash": "0x...", "block_number": N}'
```

### Issue: Database connection error
**Solution**: 
```bash
# Check database is running
docker-compose ps

# Restart database
docker-compose restart db

# Check logs
docker-compose logs db
```

### Issue: Smart contract compilation error
**Solution**:
```bash
# Update Rust and Cargo
rustup update

# Clean and rebuild
cd /home/gamp/backend/contracts/vesting-vault
cargo clean
cargo build --target wasm32-unknown-unknown --release
```

---

## Support & Documentation

- **Architecture**: See [ARCHITECTURE.md](../ARCHITECTURE.md)
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
- **API Docs**: Available at http://localhost:3000/api-docs
- **Smart Contract Docs**: See contracts/ directory

---

## Conclusion

Once all tests pass, the Gas Refund Incentive for Storage Cleanup feature is ready for production deployment. The implementation provides:

✅ **Efficient Storage Cleanup** - Incentivizes removal of empty vault ledger entries  
✅ **Fair Rewards System** - Returns platform fees to cleanup contributors  
✅ **Transparent Tracking** - Dashboard visibility of available rewards  
✅ **Secure Transactions** - Multi-step verification and audit logging  
✅ **Scalable Architecture** - Works with any vault size or number

