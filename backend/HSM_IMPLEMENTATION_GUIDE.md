# HSM Signer Gateway Implementation

## Overview

The HSM Signer Gateway provides enterprise-grade, isolated signing capabilities for Stellar Soroban transactions. This implementation ensures that private keys never touch the backend server, meeting the security requirements for institutional investors and large DAOs.

## Architecture

### Core Components

1. **HSM Gateway Service** (`src/services/hsmGatewayService.js`)
   - Main service for HSM operations
   - Supports AWS KMS, HashiCorp Vault, and GCP KMS
   - Handles transaction XDR preparation and signing

2. **Multi-Sig Integration** (`src/services/multiSigRevocationService.js`)
   - Updated to use HSM gateway for secure signing
   - Fallback to mock implementation for development
   - Maintains existing multi-signature workflow

3. **Security Middleware** (`src/middleware/auth.middleware.js`)
   - Admin authentication and authorization
   - IP whitelisting and time restrictions
   - Request validation and audit logging

4. **API Routes** (`src/routes/hsm.js`)
   - RESTful endpoints for HSM operations
   - Rate limiting and security controls
   - Comprehensive error handling

## Security Features

### Isolated Signing Architecture
- **Private Key Protection**: Keys never leave the HSM
- **Transaction Preparation**: Backend only prepares XDR, never signs
- **Secure Communication**: Encrypted communication with HSM providers
- **Audit Trail**: Complete logging of all HSM operations

### Access Controls
- **Admin Authentication**: JWT-based authentication with role-based access
- **IP Whitelisting**: Optional IP-based restrictions
- **Time Restrictions**: Business hours enforcement
- **Rate Limiting**: Prevent abuse of HSM operations

### Validation & Security
- **Input Validation**: Comprehensive parameter validation
- **Address Validation**: Stellar address format verification
- **Transaction Validation**: XDR structure verification
- **Error Handling**: Secure error responses without information leakage

## Supported HSM Providers

### AWS KMS
```javascript
// Configuration
HSM_PROVIDER=aws-kms
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
```

### HashiCorp Vault
```javascript
// Configuration
HSM_PROVIDER=hashicorp-vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=your_vault_token
```

### GCP KMS
```javascript
// Configuration
HSM_PROVIDER=gcp-kms
GCP_PROJECT_ID=your-project
GCP_LOCATION_ID=global
GCP_KEY_RING_ID=your-key-ring
```

## API Endpoints

### Prepare Transaction
```http
POST /api/hsm/prepare-transaction
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "proposal": {
    "id": 1,
    "vault_address": "GD...",
    "beneficiary_address": "GD...",
    "amount_to_revoke": "1000",
    "status": "approved"
  }
}
```

### Sign Transaction
```http
POST /api/hsm/sign-transaction
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "transactionXDR": "AAAA...",
  "keyId": "arn:aws:kms:...",
  "signerAddress": "GD..."
}
```

### Batch Revoke (Complete Flow)
```http
POST /api/hsm/batch-revoke
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "proposal": { ... },
  "signingKeyIds": {
    "GD...": "arn:aws:kms:...",
    "GD...": "arn:aws:kms:..."
  }
}
```

### Broadcast Transaction
```http
POST /api/hsm/broadcast-transaction
Content-Type: application/json
Authorization: Bearer <admin_jwt>

{
  "signedTransactionXDR": "AAAA..."
}
```

### HSM Status
```http
GET /api/hsm/status
Authorization: Bearer <admin_jwt>
```

## Integration Guide

### 1. Environment Setup
```bash
# Copy HSM configuration template
cp .env.hsm.example .env

# Configure your HSM provider
# Set required environment variables
# Configure admin addresses and key mappings
```

### 2. Database Migration
```bash
# Run the admin table migration
psql -d vesting_vault -f migrations/010_create_admins_table.sql
```

### 3. Admin Setup
```sql
-- Create super admin
INSERT INTO admins (address, name, email, role, permissions, is_active)
VALUES (
    '0x1234567890123456789012345678901234567890',
    'Super Admin',
    'admin@company.com',
    'super_admin',
    '{"can_access_hsm": true}',
    true
);
```

### 4. HSM Key Configuration
```bash
# Option 1: JSON mapping
HSM_KEY_MAPPING='{"0x1234...": "arn:aws:kms:..."}'

# Option 2: Environment variables
HSM_KEY_1234567890123456789012345678901234567890=arn:aws:kms:...
```

## Deployment Checklist

### Security Configuration
- [ ] HSM provider credentials configured
- [ ] Admin addresses whitelisted
- [ ] IP restrictions configured (if needed)
- [ ] Time restrictions configured (if needed)
- [ ] JWT secret set to strong value
- [ ] Database credentials secured

### Testing
- [ ] HSM connection test successful
- [ ] Admin authentication working
- [ ] Transaction preparation test
- [ ] Mock signing flow test
- [ ] Security controls validation
- [ ] Rate limiting verification

### Monitoring
- [ ] HSM status endpoint accessible
- [ ] Audit logging enabled
- [ ] Error monitoring configured
- [ ] Performance metrics collected
- [ ] Health check endpoint functional

## Development & Testing

### Mock Mode
For development without real HSM access:
```bash
NODE_ENV=development
HSM_FALLBACK_ENABLED=true
```

### Test Suite
```bash
# Run HSM integration tests
node test-hsm-integration.js
```

### Local Testing
```bash
# Start the backend
npm start

# Test HSM status
curl -H "Authorization: Bearer <token>" \
     http://localhost:4000/api/hsm/status
```

## Security Best Practices

### Production Deployment
1. **Network Security**: Use VPC/private endpoints for HSM access
2. **Access Control**: Implement principle of least privilege
3. **Monitoring**: Comprehensive logging and alerting
4. **Backup**: Secure backup of HSM configuration
5. **Rotation**: Regular key rotation policies

### Operational Security
1. **Admin Management**: Regular review of admin permissions
2. **Audit Review**: Periodic audit log analysis
3. **Security Updates**: Keep dependencies updated
4. **Incident Response**: Clear security incident procedures

## Troubleshooting

### Common Issues

1. **HSM Connection Failed**
   - Verify credentials and network access
   - Check HSM provider service status
   - Validate configuration parameters

2. **Authentication Failed**
   - Verify JWT token validity
   - Check admin permissions
   - Review address whitelist

3. **Transaction Preparation Failed**
   - Validate proposal data
   - Check Stellar network connectivity
   - Verify contract configuration

4. **Rate Limiting**
   - Check rate limit configuration
   - Review recent activity logs
   - Adjust limits if needed

### Debug Mode
```bash
# Enable debug logging
DEBUG=hsm:* npm start

# Check HSM status
curl http://localhost:4000/api/hsm/health
```

## Performance Considerations

### Optimization
- **Connection Pooling**: Reuse HSM client connections
- **Batch Operations**: Group multiple signatures when possible
- **Caching**: Cache HSM status and configuration
- **Async Processing**: Use background jobs for heavy operations

### Scaling
- **Horizontal Scaling**: Multiple backend instances
- **Load Balancing**: Distribute HSM operations
- **Rate Limiting**: Prevent HSM provider limits
- **Monitoring**: Track performance metrics

## Compliance

### Standards Met
- **SOC 2**: Security and availability controls
- **ISO 27001**: Information security management
- **GDPR**: Data protection and privacy
- **PCI DSS**: Payment card industry standards (if applicable)

### Audit Trail
- Complete logging of all HSM operations
- Immutable audit records
- Tamper-evident logging
- Regular audit report generation

## Support & Maintenance

### Regular Tasks
- Monthly security review
- Quarterly key rotation
- Annual compliance audit
- Ongoing monitoring

### Emergency Procedures
- HSM provider outage response
- Security incident handling
- Key compromise procedures
- Disaster recovery testing

## Conclusion

The HSM Signer Gateway provides a robust, secure solution for enterprise-grade vault operations. By implementing isolated signing, we ensure that private keys never touch the backend, meeting the stringent security requirements of institutional investors and large DAOs.

The implementation includes comprehensive security controls, multiple HSM provider support, and seamless integration with existing multi-signature workflows. The fallback mechanisms and thorough testing ensure reliable operation in both development and production environments.
