# API Documentation for Verinode Vesting Vault System

## Overview
The Verinode Vesting Vault API provides a comprehensive interface for managing vesting schedules, claims, and administrative operations. This system supports both REST and GraphQL APIs for maximum flexibility.

## Swagger Documentation

### Accessing the Documentation
The API documentation is available through Swagger UI at:
- **Local Development**: http://localhost:3000/api-docs
- **Production**: [Replace with production URL]

### API Endpoints

#### 1. General Endpoints
- `GET /` - Health check endpoint
- `GET /health` - Detailed health status

#### 2. Claims Endpoints
- `POST /api/claims` - Process a new claim
- `POST /api/claims/batch` - Process multiple claims in batch
- `GET /api/claims/{userAddress}/realized-gains` - Get realized gains for a user

#### 3. Administrative Endpoints
- `POST /api/admin/revoke` - Revoke admin access
- `POST /api/admin/create` - Create new admin
- `POST /api/admin/transfer` - Transfer vault ownership
- `GET /api/admin/audit-logs` - Get audit logs

#### 4. Portfolio Endpoints
- `GET /api/user/{address}/portfolio` - Get user portfolio

#### 5. GraphQL Endpoint
- `GET/POST /graphql` - GraphQL Playground and API endpoint

### Authentication

The API supports two authentication methods:

1. **Bearer Token Authentication**:
   ```
   Authorization: Bearer <token>
   ```
   Valid tokens:
   - `admin-token` - Grants admin privileges
   - `user-token` - Grants user privileges

2. **X-User-Address Header**:
   ```
   x-user-address: <wallet_address>
   ```

### Security Schemes
- `BearerAuth`: HTTP Bearer authentication with JWT format
- `XUserAddress`: API key in header for wallet address identification

### Models

#### Vault
- `id`: Auto-generated unique identifier
- `address`: Smart contract address of the vault
- `name`: Human-readable name for the vault
- `tokenAddress`: Address of the token being vested
- `ownerAddress`: Address of the vault owner
- `totalAmount`: Total amount of tokens in the vault
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### Beneficiary
- `id`: Auto-generated unique identifier
- `vaultId`: ID of the associated vault
- `address`: Address of the beneficiary
- `totalAllocated`: Total tokens allocated to the beneficiary
- `totalWithdrawn`: Total tokens withdrawn by the beneficiary
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### SubSchedule
- `id`: Auto-generated unique identifier
- `vaultId`: ID of the associated vault
- `topUpAmount`: Amount added during the top-up
- `cliffDuration`: Duration of the cliff period in seconds
- `vestingDuration`: Duration of the vesting period in seconds
- `startTimestamp`: Start timestamp of the schedule
- `endTimestamp`: End timestamp of the schedule
- `transactionHash`: Hash of the top-up transaction
- `blockNumber`: Block number of the top-up transaction
- `amountWithdrawn`: Amount already withdrawn from this schedule
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

#### Claim
- `id`: Auto-generated unique identifier
- `userAddress`: Address of the user claiming tokens
- `tokenAddress`: Address of the claimed token
- `amountClaimed`: Amount of tokens claimed
- `claimTimestamp`: Timestamp of the claim
- `transactionHash`: Hash of the claim transaction
- `blockNumber`: Block number of the claim transaction
- `priceAtClaimUsd`: Price of the token at the time of claim in USD
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

## Getting Started

1. Start the server:
   ```bash
   cd backend
   npm run dev
   ```

2. Access the Swagger documentation at http://localhost:3000/api-docs

3. Use the interactive documentation to test API endpoints

## GraphQL Schema

The GraphQL schema provides comprehensive access to all features of the vesting vault system. The schema includes:
- Queries for retrieving vaults, beneficiaries, sub-schedules, and claims
- Mutations for creating and updating vaults, processing claims, and administrative operations
- Subscriptions for real-time updates on vault changes