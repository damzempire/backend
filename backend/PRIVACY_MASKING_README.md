# Zero-Knowledge Privacy Metadata Masking

## Overview

This feature implements "Architectural Privacy" for vault token amounts, enabling the "Right to Financial Discretion" for high-profile investors, celebrity founders, and privacy-conscious VCs. When enabled, the public API returns masked token ranges instead of exact amounts, while authorized users (admin, owner, beneficiaries) can still see the real values.

## Features

### Privacy Tiers

The system categorizes token amounts into the following tiers:

| Tier | Range | Display Label |
|------|-------|---------------|
| TINY | 0 - 1,000 | "Under 1k" |
| SMALL | 1,000 - 10,000 | "Between 1k and 10k" |
| MEDIUM | 10,000 - 50,000 | "Between 10k and 50k" |
| LARGE | 50,000 - 100,000 | "Between 50k and 100k" |
| XLARGE | 100,000 - 500,000 | "Between 100k and 500k" |
| HUGE | 500,000 - 1,000,000 | "Between 500k and 1M" |
| MASSIVE | 1,000,000+ | "Over 1M" |

### Authorization Levels

- **Admin Users**: Can see all vault data unmasked
- **Vault Owners**: Can see their own vault data unmasked  
- **Beneficiaries**: Can see vault data where they are beneficiaries unmasked
- **Public Users**: See masked ranges when privacy mode is enabled

## API Endpoints

### GET /api/registry/vaults/{contractId}

Returns vault details with privacy masking applied when necessary.

**Response with Privacy Mode Enabled (Public User):**
```json
{
  "success": true,
  "data": {
    "contract_id": "ABC123...",
    "vaultDetails": {
      "total_amount": {
        "is_masked": true,
        "amount": 25000,
        "display_amount": "Between 10k and 50k",
        "tier": "Between 10k and 50k",
        "range": { "min": 10000, "max": 50000 }
      },
      "privacy_mode_enabled": true,
      "data_masked": true
    }
  }
}
```

**Response with Privacy Mode Enabled (Authorized User):**
```json
{
  "success": true,
  "data": {
    "contract_id": "ABC123...",
    "vaultDetails": {
      "total_amount": 25000,
      "privacy_mode_enabled": true,
      "data_masked": false
    }
  }
}
```

### POST /api/admin/vault/privacy

Toggle privacy mode for a vault.

**Request:**
```json
{
  "adminAddress": "0xADMIN_ADDRESS",
  "vaultId": "vault-uuid-here",
  "privacyModeEnabled": true,
  "privacyMetadata": {
    "reason": "Celebrity founder privacy request",
    "approvedBy": "0xADMIN_ADDRESS"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "vault_id": "vault-uuid-here",
    "privacy_mode_enabled": true,
    "privacy_metadata": {
      "reason": "Celebrity founder privacy request",
      "approvedBy": "0xADMIN_ADDRESS"
    }
  }
}
```

## Database Schema

### Vaults Table Addition

```sql
ALTER TABLE vaults 
ADD COLUMN privacy_mode_enabled BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN privacy_metadata JSON DEFAULT NULL;

CREATE INDEX idx_vaults_privacy_mode ON vaults(privacy_mode_enabled);
```

## Implementation Details

### Core Components

1. **Privacy Masking Utility** (`src/utils/privacyMasking.js`)
   - `maskTokenAmount()`: Converts exact amounts to tier ranges
   - `hasUnmaskedPermission()`: Checks user authorization
   - `applyPrivacyMasking()`: Applies masking to vault data

2. **Database Migration** (`migrations/018_add_privacy_mode_to_vaults.sql`)
   - Adds privacy fields to vaults table
   - Creates performance indexes

3. **API Integration** (`src/routes/vaultRegistry.js`)
   - Integrates privacy masking into vault endpoint
   - Optional authentication for permission checking

4. **Admin Endpoint** (`src/index.js`)
   - Privacy mode toggle functionality
   - Admin and owner authorization

### Security Considerations

- Privacy mode can only be toggled by admins or vault owners
- Authentication is optional for public access but required for admin functions
- All masking operations are server-side to prevent client-side tampering
- Audit logs are maintained for privacy mode changes

## Use Cases

### Celebrity Founders
High-profile founders can enable privacy mode to:
- Hide exact token amounts from public scrutiny
- Prevent targeted attacks based on wealth disclosure
- Maintain competitive advantage

### Privacy-Conscious VCs
Venture capital firms can:
- Support projects without revealing investment amounts
- Protect portfolio strategy from competitors
- Maintain discretion in competitive markets

### Enterprise Clients
Corporate treasuries can:
- Participate in DeFi while maintaining financial privacy
- Comply with internal disclosure policies
- Prevent market manipulation based on large positions

## Testing

Run the comprehensive test suite:

```bash
npm test -- --testPathPattern=privacyMasking.test.js
```

Or run the demo:

```bash
node demo-privacy.js
```

## Future Enhancements

1. **Custom Privacy Tiers**: Allow vault owners to define custom ranges
2. **Time-Based Privacy**: Automatically disable privacy after certain conditions
3. **Gradual Revealing**: Progressive disclosure of amounts over time
4. **Zero-Knowledge Proofs**: Implement cryptographic privacy guarantees
5. **Privacy Analytics**: Aggregate statistics without revealing individual data

## Compliance

This feature supports:
- **GDPR**: Right to privacy and data protection
- **Financial Discretion**: Professional confidentiality standards
- **Security**: Reduces attack surface for high-net-worth individuals
- **Competitive Protection**: Safeguards strategic financial information
