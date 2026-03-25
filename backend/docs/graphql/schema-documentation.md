# GraphQL Schema Documentation

This document provides comprehensive documentation for the Verinode Vesting Vault GraphQL API schema.

## Table of Contents

- [Schema Overview](#schema-overview)
- [Types](#types)
  - [Core Types](#core-types)
  - [Input Types](#input-types)
  - [Custom Scalars](#custom-scalars)
- [Queries](#queries)
- [Mutations](#mutations)
- [Subscriptions](#subscriptions)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Schema Overview

The GraphQL schema provides a complete interface for interacting with the Verinode Vesting Vault system. It supports:

- **Vault management**: Create, read, and update vaults
- **Beneficiary operations**: Manage beneficiaries and withdrawals
- **Claims processing**: Handle token claims and calculate gains
- **Admin functions**: Administrative operations and audit logging
- **Real-time updates**: Live subscriptions for data changes

## Custom Scalars

### DateTime
Represents a date and time value in ISO 8601 format.
```graphql
"2024-01-01T00:00:00Z"
```

### Decimal
Represents a decimal number with high precision for financial calculations.
```graphql
"1234.567890123456789"
```

## Core Types

### Vault
Represents a vesting vault contract.

```graphql
type Vault {
  id: ID!                    # Unique identifier
  address: String!           # Smart contract address
  name: String               # Human-readable name
  tokenAddress: String!      # Address of vested token
  ownerAddress: String!      # Vault owner address
  totalAmount: Decimal!      # Total tokens in vault
  createdAt: DateTime!       # Creation timestamp
  updatedAt: DateTime!       # Last update timestamp
  beneficiaries: [Beneficiary!]!  # Associated beneficiaries
  subSchedules: [SubSchedule!]!   # Vesting sub-schedules
  summary: VaultSummary      # Vault summary information
}
```

**Fields:**
- `id`: Internal unique identifier
- `address`: Blockchain address of the vault contract
- `name`: Optional human-readable name for the vault
- `tokenAddress`: Address of the token being vested
- `ownerAddress`: Address of the vault owner
- `totalAmount`: Total amount of tokens deposited in the vault
- `createdAt`: When the vault was created
- `updatedAt`: When the vault was last updated
- `beneficiaries`: List of beneficiaries associated with this vault
- `subSchedules`: List of vesting sub-schedules from top-ups
- `summary`: Calculated summary information about the vault

### Beneficiary
Represents a beneficiary of a vault.

```graphql
type Beneficiary {
  id: ID!                           # Unique identifier
  vaultId: ID!                      # Associated vault ID
  address: String!                  # Beneficiary wallet address
  totalAllocated: Decimal!          # Total allocated tokens
  totalWithdrawn: Decimal!          # Total withdrawn tokens
  createdAt: DateTime!              # Creation timestamp
  updatedAt: DateTime!              # Last update timestamp
  vault: Vault!                     # Associated vault
  withdrawableAmount(withdrawableAt: DateTime): WithdrawableInfo!  # Calculated withdrawable amount
}
```

**Fields:**
- `id`: Internal unique identifier
- `vaultId`: ID of the associated vault
- `address`: Wallet address of the beneficiary
- `totalAllocated`: Total tokens allocated to this beneficiary
- `totalWithdrawn`: Total tokens already withdrawn
- `createdAt`: When the beneficiary was added
- `updatedAt`: When the beneficiary was last updated
- `vault`: The associated vault object
- `withdrawableAmount`: Calculated withdrawable amount at a specific time

### SubSchedule
Represents a vesting sub-schedule created by a top-up.

```graphql
type SubSchedule {
  id: ID!                    # Unique identifier
  vaultId: ID!               # Associated vault ID
  topUpAmount: Decimal!      # Amount added in this top-up
  cliffDuration: Int!        # Cliff duration in seconds
  vestingDuration: Int!      # Total vesting duration in seconds
  startTimestamp: DateTime!  # When vesting starts (cliff end)
  endTimestamp: DateTime!    # When vesting fully completes
  amountWithdrawn: Decimal!  # Amount withdrawn from this schedule
  transactionHash: String!   # Transaction hash of top-up
  blockNumber: String!       # Block number of top-up
  createdAt: DateTime!       # Creation timestamp
  updatedAt: DateTime!       # Last update timestamp
  vault: Vault!              # Associated vault
}
```

### ClaimsHistory
Represents a token claim record.

```graphql
type ClaimsHistory {
  id: ID!                    # Unique identifier
  userAddress: String!       # User wallet address
  tokenAddress: String!      # Token contract address
  amountClaimed: Decimal!    # Amount claimed
  claimTimestamp: DateTime!  # When the claim occurred
  transactionHash: String!    # Transaction hash
  blockNumber: String!       # Block number
  priceAtClaimUsd: Decimal    # Token price in USD at claim time
  createdAt: DateTime!       # Record creation timestamp
  updatedAt: DateTime!       # Last update timestamp
}
```

### VaultSummary
Calculated summary information for a vault.

```graphql
type VaultSummary {
  totalAllocated: Decimal!   # Total allocated to beneficiaries
  totalWithdrawn: Decimal!   # Total withdrawn by beneficiaries
  remainingAmount: Decimal!  # Remaining allocatable amount
  activeBeneficiaries: Int!  # Number of active beneficiaries
  totalBeneficiaries: Int!   # Total number of beneficiaries
}
```

### WithdrawableInfo
Information about withdrawable amounts for a beneficiary.

```graphql
type WithdrawableInfo {
  totalWithdrawable: Decimal!  # Currently withdrawable amount
  vestedAmount: Decimal!       # Total vested amount
  remainingAmount: Decimal!    # Remaining allocated amount
  isFullyVested: Boolean!      # Whether fully vested
  nextVestTime: DateTime       # Next vesting timestamp
}
```

### RealizedGains
Calculated realized gains for a user.

```graphql
type RealizedGains {
  totalGains: Decimal!         # Total realized gains in USD
  claims: [ClaimsHistory!]!    # Associated claims
  periodStart: DateTime        # Period start date
  periodEnd: DateTime          # Period end date
}
```

### AuditLog
Administrative audit log entry.

```graphql
type AuditLog {
  id: ID!                  # Unique identifier
  adminAddress: String!     # Admin wallet address
  action: String!           # Action performed
  targetVault: String       # Target vault address
  details: String          # Additional details
  timestamp: DateTime!      # When action occurred
  transactionHash: String   # Associated transaction hash
}
```

### AdminTransfer
Administrative transfer record.

```graphql
type AdminTransfer {
  id: ID!                      # Unique identifier
  currentAdminAddress: String! # Current admin address
  newAdminAddress: String!     # New admin address
  contractAddress: String!     # Contract address
  status: String!              # Transfer status
  createdAt: DateTime!        # Creation timestamp
  completedAt: DateTime        # Completion timestamp
}
```

## Input Types

### CreateVaultInput
Input for creating a new vault.

```graphql
input CreateVaultInput {
  address: String!        # Vault contract address
  name: String            # Optional vault name
  tokenAddress: String!   # Token contract address
  ownerAddress: String!   # Owner wallet address
  totalAmount: Decimal!   # Initial total amount
}
```

### TopUpInput
Input for topping up a vault.

```graphql
input TopUpInput {
  vaultAddress: String!      # Vault contract address
  amount: Decimal!           # Top-up amount
  cliffDuration: Int!        # Cliff duration in seconds
  vestingDuration: Int!      # Vesting duration in seconds
  transactionHash: String!   # Transaction hash
  blockNumber: String!       # Block number
}
```

### WithdrawalInput
Input for processing a withdrawal.

```graphql
input WithdrawalInput {
  vaultAddress: String!      # Vault contract address
  beneficiaryAddress: String! # Beneficiary wallet address
  amount: Decimal!           # Withdrawal amount
  transactionHash: String!   # Transaction hash
  blockNumber: String!       # Block number
}
```

### ClaimInput
Input for processing a claim.

```graphql
input ClaimInput {
  userAddress: String!       # User wallet address
  tokenAddress: String!      # Token contract address
  amountClaimed: Decimal!    # Amount claimed
  claimTimestamp: DateTime!  # Claim timestamp
  transactionHash: String!   # Transaction hash
  blockNumber: String!       # Block number
}
```

### AdminActionInput
Input for administrative actions.

```graphql
input AdminActionInput {
  adminAddress: String!   # Admin wallet address
  targetVault: String!    # Target vault address
  reason: String          # Optional reason for action
}
```

## Queries

### Vault Queries

#### vault
Fetch a single vault by address.

```graphql
vault(address: String!): Vault
```

**Example:**
```graphql
query GetVault($address: String!) {
  vault(address: $address) {
    id
    address
    name
    tokenAddress
    ownerAddress
    totalAmount
    summary {
      totalAllocated
      totalWithdrawn
      activeBeneficiaries
    }
  }
}
```

#### vaults
Fetch multiple vaults with optional filtering and pagination.

```graphql
vaults(ownerAddress: String, first: Int, after: String): [Vault!]!
```

**Parameters:**
- `ownerAddress`: Filter by vault owner (optional)
- `first`: Number of results to return (default: 50)
- `after`: Cursor for pagination (optional)

**Example:**
```graphql
query GetVaults($ownerAddress: String, $first: Int) {
  vaults(ownerAddress: $ownerAddress, first: $first) {
    id
    address
    name
    totalAmount
    createdAt
  }
}
```

#### vaultSummary
Get calculated summary for a vault.

```graphql
vaultSummary(vaultAddress: String!): VaultSummary
```

### Beneficiary Queries

#### beneficiary
Fetch a single beneficiary.

```graphql
beneficiary(vaultAddress: String!, beneficiaryAddress: String!): Beneficiary
```

#### beneficiaries
Fetch beneficiaries for a vault.

```graphql
beneficiaries(vaultAddress: String!, first: Int, after: String): [Beneficiary!]!
```

### Claims Queries

#### claims
Fetch claims with optional filtering.

```graphql
claims(userAddress: String, tokenAddress: String, first: Int, after: String): [ClaimsHistory!]!
```

#### claim
Fetch a single claim by transaction hash.

```graphql
claim(transactionHash: String!): ClaimsHistory
```

#### realizedGains
Calculate realized gains for a user.

```graphql
realizedGains(userAddress: String!, startDate: DateTime, endDate: DateTime): RealizedGains!
```

### Admin Queries

#### auditLogs
Fetch administrative audit logs.

```graphql
auditLogs(limit: Int): [AuditLog!]!
```

#### pendingTransfers
Fetch pending admin transfers.

```graphql
pendingTransfers(contractAddress: String): [AdminTransfer!]!
```

### Health Check

#### health
Simple health check endpoint.

```graphql
health: String!
```

## Mutations

### Vault Mutations

#### createVault
Create a new vault record.

```graphql
createVault(input: CreateVaultInput!): Vault!
```

#### topUpVault
Process a vault top-up.

```graphql
topUpVault(input: TopUpInput!): SubSchedule!
```

### Withdrawal Mutations

#### withdraw
Process a beneficiary withdrawal.

```graphql
withdraw(input: WithdrawalInput!): WithdrawableInfo!
```

### Claims Mutations

#### processClaim
Process a single claim.

```graphql
processClaim(input: ClaimInput!): ClaimsHistory!
```

#### processBatchClaims
Process multiple claims.

```graphql
processBatchClaims(claims: [ClaimInput!]!): [ClaimsHistory!]!
```

#### backfillMissingPrices
Backfill missing price data for claims.

```graphql
backfillMissingPrices: Int!
```

### Admin Mutations

#### revokeAccess
Revoke access to a vault.

```graphql
revokeAccess(input: AdminActionInput!): AuditLog!
```

#### transferVault
Transfer vault ownership.

```graphql
transferVault(input: AdminActionInput!): AuditLog!
```

### Admin Key Management

#### proposeNewAdmin
Propose a new admin for a contract.

```graphql
proposeNewAdmin(input: CreateAdminTransferInput!): AdminTransfer!
```

#### acceptOwnership
Accept ownership transfer.

```graphql
acceptOwnership(input: AcceptOwnershipInput!): AdminTransfer!
```

#### transferOwnership
Directly transfer ownership.

```graphql
transferOwnership(input: CreateAdminTransferInput!): AdminTransfer!
```

## Subscriptions

### Real-time Subscriptions

#### vaultUpdated
Subscribe to vault updates.

```graphql
vaultUpdated(vaultAddress: String): Vault!
```

#### beneficiaryUpdated
Subscribe to beneficiary updates.

```graphql
beneficiaryUpdated(vaultAddress: String, beneficiaryAddress: String): Beneficiary!
```

#### newClaim
Subscribe to new claims.

```graphql
newClaim(userAddress: String): ClaimsHistory!
```

#### withdrawalProcessed
Subscribe to withdrawal processing.

```graphql
withdrawalProcessed(vaultAddress: String, beneficiaryAddress: String): WithdrawableInfo!
```

### Admin Subscriptions

#### auditLogCreated
Subscribe to new audit log entries.

```graphql
auditLogCreated: AuditLog!
```

#### adminTransferUpdated
Subscribe to admin transfer updates.

```graphql
adminTransferUpdated(contractAddress: String): AdminTransfer!
```

## Authentication

The GraphQL API supports authentication via:

1. **Bearer Token**: `Authorization: Bearer <token>`
2. **User Address Header**: `X-User-Address: <address>`

### Role-based Access

- **Public**: No authentication required
- **User**: Authentication required
- **Admin**: Admin authentication required

### Authentication Examples

```bash
# Using Bearer token
curl -X POST http://localhost:3000/graphql \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createVault(input: {...}) { id } }"}'

# Using user address header
curl -X POST http://localhost:3000/graphql \
  -H "X-User-Address: 0x123..." \
  -H "Content-Type: application/json" \
  -d '{"query":"{ vault(address:\"0x123...\") { id } }"}'
```

## Error Handling

GraphQL errors provide detailed information:

```json
{
  "errors": [
    {
      "message": "Vault not found",
      "locations": [{"line": 2, "column": 3}],
      "path": ["vault"],
      "extensions": {
        "code": "NOT_FOUND",
        "exception": {
          "stacktrace": ["Error: Vault not found..."]
        }
      }
    }
  ],
  "data": {
    "vault": null
  }
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Authentication is required
- `ADMIN_ACCESS_REQUIRED`: Admin access is required
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `INTERNAL_ERROR`: Internal server error

## Rate Limiting

The API implements role-based rate limiting:

| Role | Requests per 15 minutes |
|------|------------------------|
| Unauthenticated | 50 |
| User | 200 |
| Admin | 1000 |

### Rate Limit Response

```json
{
  "errors": [
    {
      "message": "Rate limit exceeded for this operation. Please try again later.",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED",
        "rateLimitInfo": {
          "limit": 100,
          "current": 101,
          "resetTime": "2024-01-01T12:15:00Z",
          "windowMs": 900000
        }
      }
    }
  ]
}
```

## Usage Examples

### Complete Vault Management Flow

```graphql
# 1. Create a vault
mutation CreateVault($input: CreateVaultInput!) {
  createVault(input: $input) {
    id
    address
    name
    tokenAddress
    ownerAddress
  }
}

# 2. Add beneficiaries (this would be done through the underlying system)
# Then query the vault with beneficiaries
query GetVaultWithBeneficiaries($address: String!) {
  vault(address: $address) {
    id
    address
    beneficiaries {
      address
      totalAllocated
      totalWithdrawn
      withdrawableAmount {
        totalWithdrawable
        isFullyVested
      }
    }
  }
}

# 3. Process a withdrawal
mutation Withdraw($input: WithdrawalInput!) {
  withdraw(input: $input) {
    totalWithdrawable
    vestedAmount
    remainingAmount
  }
}

# 4. Subscribe to updates
subscription VaultUpdates($address: String) {
  vaultUpdated(vaultAddress: $address) {
    id
    summary {
      totalWithdrawn
      activeBeneficiaries
    }
  }
}
```

This schema provides a comprehensive interface for all Verinode Vesting Vault operations while maintaining type safety and enabling real-time updates through subscriptions.
