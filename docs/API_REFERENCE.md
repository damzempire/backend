# Vesting Cliffs API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Currently no authentication is implemented. Add appropriate middleware as needed.

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message description"
}
```

## Endpoints

### 1. Create Vault
**POST** `/api/vaults`

Creates a new vesting vault with optional beneficiaries.

#### Request Body
```json
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

#### Parameters
- `address` (required): Smart contract address of the vault
- `name` (optional): Human-readable name
- `token_address` (required): Address of the token being vested
- `owner_address` (required): Address of the vault owner
- `initial_amount` (optional): Initial token amount (default: 0)
- `beneficiaries` (optional): Array of beneficiary objects

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "address": "0x1234567890123456789012345678901234567890",
    "name": "Employee Vesting Vault",
    "token_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "owner_address": "0x1111111111111111111111111111111111111111",
    "total_amount": "10000",
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Process Top-Up
**POST** `/api/vaults/{vaultAddress}/top-up`

Adds funds to an existing vault with a new cliff period.

#### Path Parameters
- `vaultAddress`: Address of the vault to top-up

#### Request Body
```json
{
  "amount": "5000",
  "cliff_duration_seconds": 2592000,
  "vesting_duration_seconds": 7776000,
  "transaction_hash": "0xabcdef1234567890abcdef1234567890abcdef12",
  "block_number": 12345,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### Parameters
- `amount` (required): Amount of tokens to add
- `cliff_duration_seconds` (optional): Cliff period in seconds (default: 0)
- `vesting_duration_seconds` (required): Total vesting period in seconds
- `transaction_hash` (required): Transaction hash
- `block_number` (required): Block number
- `timestamp` (optional): When the top-up occurred (default: now)

#### Response
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "vault_id": "vault-uuid",
    "top_up_amount": "5000",
    "cliff_duration": 2592000,
    "vesting_duration": 7776000,
    "start_timestamp": "2024-01-30T00:00:00.000Z",
    "end_timestamp": "2024-04-30T00:00:00.000Z",
    "amount_withdrawn": "0",
    "transaction_hash": "0xabcdef1234567890abcdef1234567890abcdef12",
    "block_number": 12345,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Get Vesting Schedule
**GET** `/api/vaults/{vaultAddress}/schedule`

Retrieves the complete vesting schedule for a vault.

#### Path Parameters
- `vaultAddress`: Address of the vault

#### Query Parameters
- `beneficiaryAddress` (optional): Filter for specific beneficiary

#### Response
```json
{
  "success": true,
  "data": {
    "id": "vault-uuid",
    "address": "0x1234567890123456789012345678901234567890",
    "name": "Employee Vesting Vault",
    "token_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "owner_address": "0x1111111111111111111111111111111111111111",
    "total_amount": "15000",
    "subSchedules": [
      {
        "id": "sub-uuid-1",
        "top_up_amount": "10000",
        "cliff_duration": 0,
        "vesting_duration": 7776000,
        "start_timestamp": "2024-01-01T00:00:00.000Z",
        "end_timestamp": "2024-04-01T00:00:00.000Z",
        "amount_withdrawn": "0"
      },
      {
        "id": "sub-uuid-2",
        "top_up_amount": "5000",
        "cliff_duration": 2592000,
        "vesting_duration": 7776000,
        "start_timestamp": "2024-01-30T00:00:00.000Z",
        "end_timestamp": "2024-04-30T00:00:00.000Z",
        "amount_withdrawn": "0"
      }
    ],
    "beneficiaries": [
      {
        "id": "beneficiary-uuid",
        "address": "0x2222222222222222222222222222222222222222",
        "total_allocated": "5000",
        "total_withdrawn": "0"
      }
    ]
  }
}
```

### 4. Calculate Withdrawable Amount
**GET** `/api/vaults/{vaultAddress}/{beneficiaryAddress}/withdrawable`

Calculates the amount a beneficiary can withdraw at a specific time.

#### Path Parameters
- `vaultAddress`: Address of the vault
- `beneficiaryAddress`: Address of the beneficiary

#### Query Parameters
- `timestamp` (optional): Calculate at this timestamp (default: now)

#### Response
```json
{
  "success": true,
  "data": {
    "withdrawable": "2500.00",
    "total_vested": "2500.00",
    "total_allocated": "5000.00",
    "total_withdrawn": "0.00"
  }
}
```

### 5. Process Withdrawal
**POST** `/api/vaults/{vaultAddress}/{beneficiaryAddress}/withdraw`

Processes a token withdrawal for a beneficiary.

#### Path Parameters
- `vaultAddress`: Address of the vault
- `beneficiaryAddress`: Address of the beneficiary

#### Request Body
```json
{
  "amount": "1000",
  "transaction_hash": "0xwithdraw1234567890abcdef1234567890abcdef12",
  "block_number": 12346,
  "timestamp": "2024-02-01T00:00:00Z"
}
```

#### Parameters
- `amount` (required): Amount to withdraw
- `transaction_hash` (required): Transaction hash
- `block_number` (required): Block number
- `timestamp` (optional): When the withdrawal occurred (default: now)

#### Response
```json
{
  "success": true,
  "data": {
    "success": true,
    "amount_withdrawn": "1000",
    "remaining_withdrawable": "1500",
    "distribution": [
      {
        "sub_schedule_id": "sub-uuid-1",
        "amount": "1000"
      }
    ]
  }
}
```

### 6. Get Vault Summary
**GET** `/api/vaults/{vaultAddress}/summary`

Retrieves a comprehensive summary of vault status.

#### Path Parameters
- `vaultAddress`: Address of the vault

#### Response
```json
{
  "success": true,
  "data": {
    "vault_address": "0x1234567890123456789012345678901234567890",
    "token_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "total_amount": "15000",
    "total_top_ups": 2,
    "total_beneficiaries": 1,
    "sub_schedules": [
      {
        "id": "sub-uuid-1",
        "top_up_amount": "10000",
        "cliff_duration": 0,
        "vesting_duration": 7776000,
        "start_timestamp": "2024-01-01T00:00:00.000Z",
        "end_timestamp": "2024-04-01T00:00:00.000Z",
        "amount_withdrawn": "1000"
      },
      {
        "id": "sub-uuid-2",
        "top_up_amount": "5000",
        "cliff_duration": 2592000,
        "vesting_duration": 7776000,
        "start_timestamp": "2024-01-30T00:00:00.000Z",
        "end_timestamp": "2024-04-30T00:00:00.000Z",
        "amount_withdrawn": "0"
      }
    ],
    "beneficiaries": [
      {
        "address": "0x2222222222222222222222222222222222222222",
        "total_allocated": "5000",
        "total_withdrawn": "1000"
      }
    ]
  }
}
```

## Error Codes

| Error | Description | HTTP Status |
|-------|-------------|-------------|
| Vault not found | Vault with specified address doesn't exist | 404 |
| Invalid address | Address is not a valid Ethereum address | 400 |
| Insufficient vested amount | Withdrawal amount exceeds vested amount | 400 |
| Duplicate transaction | Transaction hash already exists | 400 |
| Invalid timestamp | Timestamp format is invalid | 400 |
| Database error | Internal database error | 500 |

## Example Usage

### Complete Flow Example

```bash
# 1. Create a vault
curl -X POST http://localhost:3000/api/vaults \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x1234567890123456789012345678901234567890",
    "name": "Employee Vesting",
    "token_address": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    "owner_address": "0x1111111111111111111111111111111111111111",
    "beneficiaries": [
      {
        "address": "0x2222222222222222222222222222222222222222",
        "allocation": "10000"
      }
    ]
  }'

# 2. Add initial funding (no cliff)
curl -X POST http://localhost:3000/api/vaults/0x1234567890123456789012345678901234567890/top-up \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "10000",
    "cliff_duration_seconds": 0,
    "vesting_duration_seconds": 126144000,
    "transaction_hash": "0xinitial1234567890abcdef1234567890abcdef12",
    "block_number": 12345,
    "timestamp": "2024-01-01T00:00:00Z"
  }'

# 3. Add bonus funding (with cliff)
curl -X POST http://localhost:3000/api/vaults/0x1234567890123456789012345678901234567890/top-up \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "2000",
    "cliff_duration_seconds": 2592000,
    "vesting_duration_seconds": 63072000,
    "transaction_hash": "0xbonus1234567890abcdef1234567890abcdef12",
    "block_number": 12346,
    "timestamp": "2024-06-01T00:00:00Z"
  }'

# 4. Check withdrawable amount
curl "http://localhost:3000/api/vaults/0x1234567890123456789012345678901234567890/0x2222222222222222222222222222222222222222/withdrawable?timestamp=2024-12-01T00:00:00Z"

# 5. Process withdrawal
curl -X POST http://localhost:3000/api/vaults/0x1234567890123456789012345678901234567890/0x2222222222222222222222222222222222222222/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "1500",
    "transaction_hash": "0xwithdraw1234567890abcdef1234567890abcdef12",
    "block_number": 12347,
    "timestamp": "2024-12-01T00:00:00Z"
  }'

# 6. Get vault summary
curl "http://localhost:3000/api/vaults/0x1234567890123456789012345678901234567890/summary"
```

## Rate Limiting
Currently no rate limiting is implemented. Add appropriate middleware as needed.

## Pagination
Large result sets should be paginated. This will be implemented in future versions.
