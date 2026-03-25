# JWT Token Refresh Rotation System

This document describes the secure JWT token refresh rotation system implemented for admin sessions in the Vesting Vault backend.

## Overview

The system implements a secure token refresh mechanism with the following security features:

- **Short-lived access tokens** (15 minutes) for reduced exposure
- **Secure HTTP-only refresh tokens** stored in cookies
- **Token rotation** that invalidates old refresh tokens
- **Role-based authentication** (admin/user)
- **Secure cookie configuration** with `SameSite=Strict`, `HttpOnly`, and `Secure` flags

## Architecture

### Token Types

1. **Access Token**
   - Short-lived (15 minutes)
   - Contains user address and role
   - Sent in Authorization header
   - Used for API authentication

2. **Refresh Token**
   - Longer-lived (7 days)
   - Stored in secure HTTP-only cookies
   - Used to obtain new access tokens
   - Automatically rotated on each use

### Security Features

#### Token Rotation
- Each refresh token use generates a new token pair
- Old refresh tokens are immediately invalidated
- Prevents token replay attacks

#### Secure Cookies
```javascript
const cookieOptions = {
  httpOnly: true,        // Prevent JavaScript access
  secure: true,          // HTTPS only in production
  sameSite: 'Strict',    // Prevent CSRF
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh' // Restrict to refresh endpoint
};
```

#### Token Storage
- Refresh tokens are hashed using bcrypt (12 rounds)
- Only hashed tokens stored in database
- Tokens are invalidated on logout

## API Endpoints

### POST /api/auth/login
Authenticate user and create token pair.

**Request:**
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "signature": "ethereum-signature"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m",
    "tokenType": "Bearer"
  }
}
```

**Cookies Set:**
- `refreshToken` (HTTP-only, Secure, SameSite=Strict)

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request:**
- Can use cookie (preferred) or request body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..." // Optional if using cookie
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": "15m",
    "tokenType": "Bearer"
  }
}
```

**Security:**
- Old refresh token is revoked
- New refresh token set in cookie
- Token rotation enforced

### POST /api/auth/logout
Logout and invalidate all user tokens.

**Request:**
```javascript
Headers: Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Security:**
- All user refresh tokens revoked
- Refresh token cookie cleared

### GET /api/auth/me
Get current user information.

**Request:**
```javascript
Headers: Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "address": "0x1234567890123456789012345678901234567890",
    "role": "admin"
  }
}
```

## Database Schema

### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) NOT NULL UNIQUE,           -- Hashed refresh token
    user_address VARCHAR(42) NOT NULL,             -- User wallet address
    expires_at TIMESTAMP NOT NULL,                 -- Token expiration
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,     -- Revocation status
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `idx_refresh_tokens_token` - Unique token lookup
- `idx_refresh_tokens_user_address` - User token lookup
- `idx_refresh_tokens_expires_at` - Expiration cleanup
- `idx_refresh_tokens_active` - Active tokens composite index

## Configuration

### Environment Variables

```bash
# JWT Secrets (use different secrets for access and refresh tokens)
JWT_SECRET=your-super-secret-access-token-key
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key

# Environment
NODE_ENV=production  # Enables secure cookies
```

### Token Expiry
- Access Token: 15 minutes
- Refresh Token: 7 days
- Cleanup: Expired tokens removed periodically

## Usage Examples

### Frontend Integration

```javascript
// Login
const login = async (address, signature) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature }),
    credentials: 'include' // Important for cookies
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data;
  }
};

// Token refresh
const refreshToken = async () => {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include' // Important for cookies
    });
    
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      return data.data.accessToken;
    }
  } catch (error) {
    // Refresh failed, redirect to login
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  }
};

// API call with automatic refresh
const apiCall = async (url, options = {}) => {
  let token = localStorage.getItem('accessToken');
  
  const makeRequest = async (accessToken) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`
      },
      credentials: 'include'
    });
  };
  
  let response = await makeRequest(token);
  
  // If unauthorized, try to refresh
  if (response.status === 401) {
    token = await refreshToken();
    response = await makeRequest(token);
  }
  
  return response;
};
```

### Backend Middleware Usage

```javascript
// Protect admin routes
app.delete('/api/admin/:id', 
  authService.authenticate(true), // requireAdmin = true
  async (req, res) => {
    // req.user contains { address, role }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // Admin logic here
  }
);

// Protect user routes
app.get('/api/user/profile',
  authService.authenticate(false), // requireAdmin = false
  async (req, res) => {
    // req.user contains { address, role }
    // User logic here
  }
);
```

## Security Considerations

### Token Storage
- **Access Tokens**: Stored in memory/localStorage (short-lived)
- **Refresh Tokens**: Stored in HTTP-only cookies (secure)
- **Database**: Only hashed refresh tokens stored

### Attack Prevention

#### Replay Attacks
- Token rotation prevents reuse of refresh tokens
- Each refresh invalidates the old token

#### XSS Protection
- HTTP-only cookies prevent JavaScript access
- Access tokens are short-lived

#### CSRF Protection
- SameSite=Strict prevents cross-site requests
- Tokens only sent to same origin

#### Session Hijacking
- Secure cookies only sent over HTTPS
- Short access token lifespan

### Best Practices

1. **Use HTTPS in production**
2. **Rotate JWT secrets regularly**
3. **Monitor token usage patterns**
4. **Implement rate limiting on auth endpoints**
5. **Log authentication events**
6. **Clean up expired tokens periodically**

## Testing

### Running Tests

```bash
cd backend
node test-jwt-refresh.js
```

### Test Coverage

The test suite verifies:
- ✅ Login and token creation
- ✅ Token refresh with cookies and body
- ✅ Protected endpoint access
- ✅ Token expiration handling
- ✅ Logout and token revocation
- ✅ Token rotation security
- ✅ Role-based authentication
- ✅ Error handling

### Manual Testing

1. **Login Flow:**
   ```bash
   curl -X POST http://localhost:4000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"address":"0x1234...","signature":"test"}' \
     -c cookies.txt
   ```

2. **Token Refresh:**
   ```bash
   curl -X POST http://localhost:4000/api/auth/refresh \
     -b cookies.txt \
     -c cookies.txt
   ```

3. **Protected Endpoint:**
   ```bash
   curl -X GET http://localhost:4000/api/auth/me \
     -H "Authorization: Bearer <access_token>"
   ```

## Monitoring and Maintenance

### Token Cleanup
Implement periodic cleanup of expired tokens:

```javascript
// Add to your scheduled tasks
const cleanupJob = cron.schedule('0 2 * * *', async () => {
  const cleaned = await authService.cleanupExpiredTokens();
  console.log(`Cleaned up ${cleaned} expired tokens`);
});
```

### Security Monitoring
Monitor for:
- Unusual token refresh patterns
- Multiple failed refresh attempts
- Tokens from unexpected IP addresses
- Rapid token rotation (potential attacks)

### Performance Considerations
- **Database Indexes**: Optimized for token lookups
- **Hashing**: bcrypt with 12 rounds (balance of security/performance)
- **Token Size**: Minimal payload to reduce overhead
- **Cookie Size**: Small refresh tokens

## Troubleshooting

### Common Issues

1. **Token not found in database**
   - Check token expiration
   - Verify database connection
   - Check token hashing

2. **Cookie not being set**
   - Verify HTTPS in production
   - Check cookie domain/path settings
   - Ensure CORS allows credentials

3. **Refresh token reuse**
   - Verify token rotation is working
   - Check for concurrent requests
   - Review client-side token handling

### Debug Logging

Enable debug logging for authentication:

```bash
DEBUG=auth:* node src/index.js
```

## Migration Guide

### From Simple Token Auth

1. **Update Environment Variables:**
   ```bash
   JWT_SECRET=your-new-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   ```

2. **Run Database Migration:**
   ```bash
   psql -d your_db < migrations/008_create_refresh_tokens_table.sql
   ```

3. **Update Client Code:**
   - Replace direct token storage with cookie-based refresh
   - Implement automatic token refresh
   - Update error handling for 401 responses

4. **Deploy Gradually:**
   - Maintain backward compatibility
   - Monitor authentication success rates
   - Roll back if issues arise

## Future Enhancements

### Planned Features

1. **Device Fingerprinting**: Bind tokens to specific devices
2. **IP Whitelisting**: Restrict token usage by IP
3. **Biometric Auth**: Additional authentication factors
4. **Token Analytics**: Usage patterns and security insights
5. **Multi-tenant Support**: Isolate tokens by organization

### Security Improvements

1. **Shorter Refresh Tokens**: Reduce refresh token lifespan
2. **Token Binding**: Bind tokens to browser/session
3. **Advanced Rotation**: Implement token trees
4. **Hardware Keys**: Support for WebAuthn
5. **Zero Trust**: Continuous authentication verification
