# Read-Only Auditor API

## Overview

Large DAOs and VC firms often hire external firms to audit their Digital Asset Holdings. This feature provides a **Read-Only Auditor API** with restricted, scoped access. An auditor is issued a temporary JWT token by an organization admin, which allows them to pull:

- **Vesting Schedules** — full vault and sub-schedule details for all vaults in the organization
- **Withdrawal History** — all claims/withdrawals made by vault beneficiaries
- **Contract Hashes** — on-chain legal document SHA-256 hashes for integrity verification

This streamlines auditing, reduces administrative burden on project founders, and provides the transparency required for institutional due diligence during fundraising rounds.

## Architecture

```
┌─────────────┐     issue token     ┌─────────────────┐
│  Org Admin   │ ──────────────────► │  POST /tokens   │
│  (JWT auth)  │                     │  (admin only)   │
└─────────────┘                     └────────┬────────┘
                                             │ returns auditor JWT
                                             ▼
┌─────────────┐   Bearer <token>    ┌─────────────────┐
│  External   │ ──────────────────► │  GET /report/*  │
│  Auditor    │                     │  (read-only)    │
└─────────────┘                     └─────────────────┘
```

## API Endpoints

### Admin Endpoints (require admin JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auditor/tokens` | Issue a new auditor token |
| `GET` | `/api/auditor/tokens/:orgId` | List all auditor tokens for an org |
| `DELETE` | `/api/auditor/tokens/:tokenId` | Revoke an auditor token |

### Auditor Read-Only Endpoints (require auditor token)

| Method | Endpoint | Scope Required | Description |
|--------|----------|----------------|-------------|
| `GET` | `/api/auditor/report/summary` | (any) | High-level audit summary |
| `GET` | `/api/auditor/report/vesting-schedules` | `vesting_schedules` | All vesting schedules with sub-schedules |
| `GET` | `/api/auditor/report/withdrawal-history` | `withdrawal_history` | Claims/withdrawal history |
| `GET` | `/api/auditor/report/contract-hashes` | `contract_hashes` | Legal document SHA-256 hashes |

## Token Issuance

### Request

```bash
POST /api/auditor/tokens
Authorization: Bearer <admin-jwt>
Content-Type: application/json

{
  "auditor_name": "Deloitte Digital Assets",
  "auditor_firm": "Deloitte",
  "org_id": "<organization-uuid>",
  "scopes": ["vesting_schedules", "withdrawal_history", "contract_hashes"],
  "expires_in_days": 30
}
```

### Response

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2026-04-24T00:00:00.000Z",
    "scopes": ["vesting_schedules", "withdrawal_history", "contract_hashes"],
    "org_id": "abc-123",
    "auditor_name": "Deloitte Digital Assets"
  }
}
```

## Using the Auditor Token

Pass the issued token as a Bearer token:

```bash
GET /api/auditor/report/vesting-schedules?page=1&limit=50
Authorization: Bearer <auditor-token>
```

All report endpoints support pagination via `page` and `limit` query parameters (max 100 per page).

## Security

- **Scoped Access**: Tokens are scoped to a single organization. Auditors can only see data belonging to their assigned org.
- **Granular Scopes**: Admins can restrict tokens to specific data types (e.g., only `vesting_schedules`).
- **Time-Limited**: Tokens expire after a configurable duration (1–90 days).
- **Revocable**: Admins can revoke tokens at any time via `DELETE /api/auditor/tokens/:tokenId`.
- **Usage Tracking**: Every token use increments a counter and records `last_used_at`.
- **Token Hashing**: Raw tokens are never stored — only SHA-256 hashes are persisted.
- **Read-Only**: All auditor endpoints are GET-only with no write access.

## Database

The feature adds an `auditor_tokens` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `token_hash` | VARCHAR(128) | SHA-256 hash of the JWT |
| `auditor_name` | VARCHAR(255) | Name of the auditor |
| `auditor_firm` | VARCHAR(255) | Audit firm name (optional) |
| `org_id` | UUID (FK) | Scoped organization |
| `issued_by` | VARCHAR(255) | Admin address that issued the token |
| `scopes` | TEXT[] | Granted permission scopes |
| `expires_at` | TIMESTAMP | Token expiration time |
| `is_revoked` | BOOLEAN | Whether the token has been revoked |
| `last_used_at` | TIMESTAMP | Last time the token was used |
| `usage_count` | INTEGER | Number of times the token was used |

Migration: `migrations/013_create_auditor_tokens_table.sql`

## Valid Scopes

| Scope | Access |
|-------|--------|
| `vesting_schedules` | Vault details + sub-schedules |
| `withdrawal_history` | Claims history with amounts and tx hashes |
| `contract_hashes` | Legal document SHA-256 fingerprints |

## Files

- `src/models/auditorToken.js` — Sequelize model
- `src/services/auditorService.js` — Business logic (token CRUD + data queries)
- `src/middleware/auditor.middleware.js` — Authentication & scope middleware
- `src/routes/auditor.js` — Express route definitions
- `test/auditorApi.test.js` — Full test suite (16 tests)
- `migrations/013_create_auditor_tokens_table.sql` — Database migration
