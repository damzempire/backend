# SEP-10 JWT Authentication Implementation

This document describes the implementation of SEP-10 JWT authentication for securing KYC endpoints in the Vesting Vault backend.

## Overview

SEP-10 (Stellar Ecosystem Proposal) defines a standard for JWT-based authentication using Stellar accounts. This implementation ensures that:

1. All KYC-related endpoints require a valid SEP-10 JWT token
2. The backend verifies the token's signature using the anchor's server public key
3. Token expiration is checked to prevent replay attacks
4. Users can only access their own PII (Personally Identifiable Information)

## Architecture

### Components

1. **SEP-10 Authentication Middleware** (`src/middleware/sep10Auth.middleware.js`)
   - Validates SEP-10 JWT tokens
   - Verifies Ed25519 signatures
   - Enforces user authorization (users can only access their own data)
   - Provides admin authentication for privileged endpoints

2. **Updated KYC Routes** (`src/routes/kycStatusRoutes.js`)
   - All endpoints now use SEP-10 authentication instead of internal JWT
   - User-specific endpoints use `sep10Auth.authenticate()`
   - Admin endpoints use `sep10Auth.authenticateAdmin()`

3. **SEP-12 Controller** (`src/modules/controllers/sep12.controller.js`)
   - Standard SEP-12 endpoints protected with SEP-10 authentication
   - Maintains backward compatibility with legacy endpoints

## Implementation Details

### SEP-10 JWT Structure

According to SEP-10 specification, JWT tokens must contain:

```json
{
  "iss": "https://anchor.example.com",  // Anchor's server URL
  "sub": "GABC...123",                  // User's Stellar public key
  "iat": 1640995200,                    // Issued at timestamp
  "exp": 1640998800                     // Expiration timestamp
}
```

### Authentication Flow

1. **Client Request**: Client includes SEP-10 JWT in Authorization header
   ```
   Authorization: Bearer <sep-10-jwt-token>
   ```

2. **Middleware Validation**:
   - Extract token from header
   - Verify Ed25519 signature using server public key
   - Validate required claims (iss, sub, exp, iat)
   - Check token expiration
   - Verify user authorization for requested resources

3. **Request Processing**:
   - Add `req.sep10User` object with user information
   - Proceed to endpoint handler

### User Authorization

The middleware enforces that users can only access their own data:

- **User endpoints**: `req.sep10User.stellarPublicKey` must match requested user address
- **Admin endpoints**: No user matching required (for administrative operations)
- **General endpoints**: No restrictions when no specific user is requested

## Environment Configuration

Required environment variable:

```bash
STELLAR_SERVER_PUBLIC_KEY=GABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz234567
```

This should be the anchor's Ed25519 public key used to sign SEP-10 JWT tokens.

## Protected Endpoints

### KYC Status Routes (`/api/kyc-status/*`)

- `GET /api/kyc-status/user/:userAddress` - User's own KYC status
- `GET /api/kyc-status/expiring` - Admin only
- `GET /api/kyc-status/expired` - Admin only
- `GET /api/kyc-status/statistics` - Admin only
- `POST /api/kyc-status/worker/*` - Admin only
- `POST /api/kyc-status/:kycId/soft-lock` - Admin only
- `POST /api/kyc-status/:kycId/remove-soft-lock` - Admin only
- `POST /api/kyc-status/:kycId/update-risk-score` - Admin only
- `GET /api/kyc-status/worker/status` - Admin only
- `GET /api/kyc-status/compliance-report` - Admin only
- `GET /api/kyc-status/admin/kyc/pending` - Admin only
- `POST /api/kyc-status/admin/kyc/approve` - Admin only
- `POST /api/kyc-status/zk-proof` - User's own data only

### SEP-12 Routes (`/customer`, `/kyc/customer`)

- `GET /customer` - User's own customer info
- `PUT /customer` - Update user's own customer info
- `GET /kyc/customer` - Legacy endpoint, same protection
- `PUT /kyc/customer` - Legacy endpoint, same protection

## Error Responses

### Authentication Required (401)
```json
{
  "success": false,
  "error": "authentication_required",
  "message": "SEP-10 JWT token required in Authorization header"
}
```

### Invalid Token (401)
```json
{
  "success": false,
  "error": "invalid_token",
  "message": "Invalid JWT signature or format",
  "details": "Token verification failed: ..."
}
```

### Invalid Claims (401)
```json
{
  "success": false,
  "error": "invalid_claims",
  "message": "Invalid SEP-10 JWT claims",
  "details": ["Missing required claim: exp", "Invalid 'sub' claim"]
}
```

### Access Denied (403)
```json
{
  "success": false,
  "error": "access_denied",
  "message": "Access denied: Users can only access their own data"
}
```

### Server Configuration Error (500)
```json
{
  "success": false,
  "error": "server_configuration_error",
  "message": "Server public key not configured"
}
```

## Security Considerations

1. **Token Expiration**: Tokens are validated for expiration with 30-second clock skew tolerance
2. **Signature Verification**: Ed25519 signatures are verified using the anchor's public key
3. **User Isolation**: Users can only access their own PII
4. **Admin Access**: Separate authentication method for administrative operations
5. **Error Handling**: Detailed error messages in development mode only

## Testing

Run the SEP-10 authentication tests:

```bash
npm test -- src/tests/sep10Auth.test.js
```

The test suite covers:
- Token extraction and validation
- SEP-10 claims validation
- User authorization logic
- Error handling scenarios
- Configuration validation

## Integration with Stellar Ecosystem

This implementation is designed to work with:

1. **Stellar Wallets**: SEP-10 compliant wallets can authenticate users
2. **Anchor Servers**: Anchor servers can sign SEP-10 JWT tokens for their users
3. **SEP-12 KYC**: Standardized KYC information exchange
4. **Stellar SDK**: For proper Ed25519 JWT verification (recommended for production)

## Production Recommendations

1. **Use stellar-sdk**: Replace the basic JWT verification with stellar-sdk for proper Ed25519 support
2. **Token Caching**: Implement token caching for performance optimization
3. **Rate Limiting**: Add rate limiting to prevent brute force attacks
4. **Monitoring**: Add logging and monitoring for authentication events
5. **Key Rotation**: Implement procedures for rotating the server signing key

## Migration Notes

This implementation replaces the previous internal JWT authentication system:

- **Before**: `authService.authenticate()` with internal JWT tokens
- **After**: `sep10Auth.authenticate()` with SEP-10 compliant JWT tokens

The migration ensures:
- Enhanced security with Stellar ecosystem standards
- Better integration with Stellar wallets and anchors
- Proper user isolation and PII protection
- Compliance with SEP-10 and SEP-12 specifications
