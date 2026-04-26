# Delegate Claiming Feature

## Overview

The Delegate Claiming feature allows beneficiaries to set a delegate address that can trigger claim functions on their behalf. This is particularly useful for users who want to keep their tokens in a cold wallet for security but want to perform claiming operations using a hot wallet for convenience.

## Features

- **Set Delegate**: Vault owners can designate a delegate address that can claim tokens on their behalf
- **Delegate Claiming**: Delegates can claim vested tokens, which are still sent to the original owner's cold wallet
- **Security**: Only authorized delegates can claim, and all actions are audited
- **Flexibility**: Delegates can be changed or removed by the vault owner at any time

## API Endpoints

### Set Delegate

**POST** `/api/delegate/set`

Sets a delegate address for a vault. Only the vault owner can set a delegate.

**Request Body:**
```json
{
  "vaultId": "uuid-of-the-vault",
  "ownerAddress": "0x1234567890123456789012345678901234567890",
  "delegateAddress": "0x9876543210987654321098765432109876543210"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Delegate set successfully",
    "vault": {
      "id": "vault-uuid",
      "vault_address": "0xabcdef...",
      "owner_address": "0x123456...",
      "delegate_address": "0x987654...",
      "token_address": "0x111111...",
      "total_amount": "1000.0",
      "is_active": true,
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

### Claim as Delegate

**POST** `/api/delegate/claim`

Allows a delegate to claim vested tokens on behalf of the vault owner.

**Request Body:**
```json
{
  "delegateAddress": "0x9876543210987654321098765432109876543210",
  "vaultAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "releaseAmount": "100.0"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Tokens claimed successfully by delegate",
    "vaultAddress": "0xabcdef...",
    "releaseAmount": "100.0",
    "ownerAddress": "0x123456...",
    "delegateAddress": "0x987654..."
  }
}
```

### Get Vault Info

**GET** `/api/delegate/:vaultAddress/info`

Retrieves vault information including delegate details.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "vault": {
      "id": "vault-uuid",
      "vault_address": "0xabcdef...",
      "owner_address": "0x123456...",
      "delegate_address": "0x987654...",
      "token_address": "0x111111...",
      "total_amount": "1000.0",
      "start_date": "2023-01-01T00:00:00.000Z",
      "end_date": "2023-12-31T00:00:00.000Z",
      "cliff_date": "2023-06-01T00:00:00.000Z",
      "is_active": true,
      "subSchedules": [
        {
          "id": "sub-schedule-uuid",
          "vault_id": "vault-uuid",
          "top_up_amount": "1000.0",
          "amount_released": "100.0",
          "vesting_start_date": "2023-02-01T00:00:00.000Z",
          "vesting_duration": 31536000,
          "is_active": true
        }
      ]
    }
  }
}
```

## Security Considerations

1. **Authorization**: Only the vault owner can set or change delegates
2. **Validation**: All addresses are validated to ensure they are valid Ethereum addresses
3. **Audit Trail**: All delegate actions are logged in the audit system
4. **Fund Security**: Tokens are always released to the original owner's address, never to the delegate

## Database Schema Changes

The `vaults` table has been updated to include:

```sql
delegate_address VARCHAR(42) NULL COMMENT 'The delegate address that can claim on behalf of the owner'
```

An index has been added to the `delegate_address` column for efficient querying.

## Usage Examples

### Setting Up a Delegate

```javascript
// Set a hot wallet as delegate for a cold wallet vault
const response = await fetch('/api/delegate/set', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    vaultId: 'vault-uuid',
    ownerAddress: '0xCOLD_WALLET_ADDRESS',
    delegateAddress: '0xHOT_WALLET_ADDRESS'
  })
});

const result = await response.json();
console.log('Delegate set:', result);
```

### Claiming as Delegate

```javascript
// Claim tokens using the hot wallet
const claimResponse = await fetch('/api/delegate/claim', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    delegateAddress: '0xHOT_WALLET_ADDRESS',
    vaultAddress: '0xVAULT_ADDRESS',
    releaseAmount: '100.0'
  })
});

const claimResult = await claimResponse.json();
console.log('Tokens claimed:', claimResult);
```

## Error Handling

Common error scenarios and their responses:

### Invalid Address
```json
{
  "success": false,
  "error": "Invalid delegate address"
}
```

### Unauthorized Access
```json
{
  "success": false,
  "error": "Vault not found or delegate not authorized"
}
```

### Insufficient Funds
```json
{
  "success": false,
  "error": "Insufficient releasable amount. Available: 50.0, Requested: 100.0"
}
```

## Testing

The delegate functionality includes comprehensive tests covering:

- Setting delegates
- Delegate claiming
- Authorization checks
- Input validation
- Integration scenarios

Run tests with:
```bash
npm test -- delegateFunctionality.test.js
```

## Migration Notes

When upgrading to support delegate functionality:

1. Run the database migration to add the `delegate_address` column
2. Existing vaults will have `delegate_address` set to `NULL`
3. No existing functionality is affected
4. Delegate functionality is opt-in - vaults must explicitly set a delegate

## Future Enhancements

Potential future improvements:

- Multiple delegates per vault
- Time-limited delegate permissions
- Delegate revocation with delay
- Delegate-specific claim limits
- Multi-signature delegate requirements
