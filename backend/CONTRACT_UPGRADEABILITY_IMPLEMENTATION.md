# Contract Upgradeability via WASM Hash Rotation - Implementation Guide

## Overview

This implementation provides a secure, governed pathway for upgrading Vesting Vault smart contracts on the Stellar network using a "Proxy-style" rotation logic. The system ensures that upgrades do not reset or alter the "Immutable Terms" (total allocations and cliff dates) of existing 4-year vesting schedules.

## Architecture

### Core Components

1. **WASM Hash Verification Service** (`wasmHashVerificationService.js`)
   - Validates proposed WASM hashes against certified builds
   - Ensures security audit compliance
   - Verifies immutable terms preservation

2. **Contract Upgrade Service** (`contractUpgradeService.js`)
   - Manages upgrade proposals and execution
   - Enforces immutable terms protection
   - Coordinates with blockchain for upgrade execution

3. **Multi-Sig Approval Service** (`contractUpgradeMultiSigService.js`)
   - Handles multi-signature approval workflows
   - Manages signer authorization and validation
   - Tracks voting status and thresholds

4. **Monitoring Service** (`contractUpgradeMonitoringService.js`)
   - Monitors proposal health and expiration
   - Sends alerts for critical events
   - Generates compliance reports

### Database Models

1. **ContractUpgradeProposal**
   - Stores upgrade proposal details
   - Tracks proposal status and metadata
   - Links to vault and signatures

2. **ContractUpgradeSignature**
   - Records multi-sig approvals/rejections
   - Validates signature authenticity
   - Tracks voting history

3. **ContractUpgradeAuditLog**
   - Comprehensive audit trail
   - Tracks all proposal actions
   - Stores compliance evidence

4. **CertifiedBuild**
   - Manages certified WASM builds
   - Stores build metadata and audit reports
   - Tracks build compatibility

## API Endpoints

### Proposal Management

#### Create Upgrade Proposal
```http
POST /api/contract-upgrade/proposals
Content-Type: application/json

{
  "vault_address": "GVAULT...",
  "proposed_wasm_hash": "a1b2c3...",
  "upgrade_reason": "Security patch and performance improvements",
  "signers": ["GSIGNER1...", "GSIGNER2...", "GSIGNER3..."],
  "required_signatures": 2,
  "admin_address": "GADMIN..."
}
```

#### Create Multi-Sig Proposal
```http
POST /api/contract-upgrade/proposals/multisig
Content-Type: application/json

{
  "vault_address": "GVAULT...",
  "proposed_wasm_hash": "a1b2c3...",
  "upgrade_reason": "Security patch and performance improvements",
  "admin_address": "GADMIN..."
}
```

#### Get Proposal Details
```http
GET /api/contract-upgrade/proposals/{proposalId}
```

#### Get Vault Proposals
```http
GET /api/contract-upgrade/vaults/{vaultAddress}/proposals?status=verified&page=1&limit=20
```

### Approval Process

#### Submit Approval/Rejection
```http
POST /api/contract-upgrade/proposals/{proposalId}/approve
Content-Type: application/json

{
  "signer_address": "GSIGNER1...",
  "signature": "0x123...",
  "decision": "approve",
  "reason": "Security improvements are necessary"
}
```

#### Submit Multi-Sig Approval
```http
POST /api/contract-upgrade/proposals/{proposalId}/multisig-approve
Content-Type: application/json

{
  "signer_address": "GSIGNER1...",
  "signature": "0x123...",
  "decision": "approve",
  "reason": "Verified security audit"
}
```

#### Get Voting Status
```http
GET /api/contract-upgrade/proposals/{proposalId}/voting-status
```

### Execution

#### Execute Approved Upgrade
```http
POST /api/contract-upgrade/proposals/{proposalId}/execute
Content-Type: application/json

{
  "admin_address": "GADMIN..."
}
```

### Multi-Sig Configuration

#### Create Multi-Sig Config
```http
POST /api/contract-upgrade/multisig-config
Content-Type: application/json

{
  "vault_address": "GVAULT...",
  "signers": ["GSIGNER1...", "GSIGNER2...", "GSIGNER3..."],
  "required_signatures": 2,
  "admin_address": "GADMIN..."
}
```

#### Get Multi-Sig Config
```http
GET /api/contract-upgrade/multisig-config/{vaultAddress}
```

#### Update Multi-Sig Config
```http
PUT /api/contract-upgrade/multisig-config/{vaultAddress}
Content-Type: application/json

{
  "signers": ["GSIGNER1...", "GSIGNER2...", "GSIGNER4..."],
  "required_signatures": 2,
  "admin_address": "GADMIN..."
}
```

### WASM Hash Verification

#### Verify WASM Hash
```http
POST /api/contract-upgrade/verify-wasm-hash
Content-Type: application/json

{
  "wasm_hash": "a1b2c3...",
  "vault_address": "GVAULT...",
  "admin_address": "GADMIN..."
}
```

#### Register Certified Build
```http
POST /api/contract-upgrade/certified-builds
Content-Type: application/json

{
  "build_id": "build-001",
  "wasm_hash": "a1b2c3...",
  "version": "1.1.0",
  "commit_hash": "abc123def456",
  "build_timestamp": "2024-01-15T10:00:00Z",
  "verification_signature": "0x789...",
  "build_metadata": {
    "contract_type": "vesting_vault",
    "immutable_terms_compatible": true,
    "compatibility_version": "1.1.0"
  },
  "audit_report_url": "https://audit.example.com/report",
  "admin_address": "GADMIN..."
}
```

#### Get Certified Builds
```http
GET /api/contract-upgrade/certified-builds?is_active=true&security_audit_passed=true&page=1&limit=20
```

### Monitoring and Auditing

#### Get Audit Logs
```http
GET /api/contract-upgrade/audit-logs/{proposalId}?page=1&limit=50
```

#### Get Upgrade Statistics
```http
GET /api/contract-upgrade/stats?vault_address=GVAULT...&days=30
```

## Security Features

### Immutable Terms Protection

The system ensures that critical vesting terms cannot be altered during upgrades:

1. **Total Allocations**: Locked amounts for beneficiaries
2. **Cliff Dates**: Vesting schedule milestones
3. **Beneficiary Addresses**: Recipient allocations

These terms are hashed and validated before any upgrade execution.

### Multi-Signature Governance

- **Minimum 2 signatures** required for any upgrade
- **Configurable signer sets** per vault
- **Signature expiration** to prevent stale approvals
- **Audit trail** for all voting actions

### Certified Build Verification

- **Security audit requirement** for all builds
- **Build metadata validation** for compatibility
- **WASM hash verification** against certified builds
- **Version compatibility checks** for safe upgrades

## Workflow Process

### 1. Build Certification

1. Developers create new WASM build with security improvements
2. Build undergoes security audit by certified auditors
3. Build metadata is registered in the system
4. WASM hash is certified and made available for upgrades

### 2. Proposal Creation

1. Admin proposes upgrade with new WASM hash
2. System verifies hash against certified builds
3. Immutable terms are captured and hashed
4. Multi-sig configuration is applied
5. Proposal is created in "verified" status

### 3. Multi-Sig Approval

1. Authorized signers receive notification
2. Each signer reviews proposal and votes
3. Signatures are validated and recorded
4. Proposal status updates based on voting
5. Threshold met → "approved" status

### 4. Upgrade Execution

1. Admin triggers execution of approved proposal
2. System re-validates immutable terms
3. Blockchain upgrade transaction is executed
4. Proposal status updated to "executed"
5. Audit logs record successful upgrade

## Monitoring and Alerts

### Automated Monitoring

The monitoring service runs every 5 minutes to check:

- **Expiring proposals** (24-hour warning)
- **Expiring signatures** (6-hour warning)
- **Failed upgrade attempts** (threshold alerts)
- **Stuck proposals** (7-day stale detection)
- **Certified build health** (deactivation alerts)

### Alert Channels

- **Slack notifications** for critical events
- **Audit logs** for compliance tracking
- **Dashboard metrics** for operational visibility

## Testing

### Unit Tests

Comprehensive test suite covering:

- Proposal creation and validation
- Multi-sig approval workflows
- Immutable terms protection
- WASM hash verification
- Error handling and edge cases

### Integration Tests

End-to-end testing of:

- Complete upgrade workflows
- Multi-sig coordination
- Blockchain integration
- Monitoring and alerting

### Security Tests

- Unauthorized access prevention
- Signature validation
- Immutable terms enforcement
- Build verification security

## Deployment Considerations

### Database Migrations

Run the following migrations to add the new tables:

```sql
-- Contract upgrade proposals
CREATE TABLE contract_upgrade_proposals (...);

-- Upgrade signatures
CREATE TABLE contract_upgrade_signatures (...);

-- Audit logs
CREATE TABLE contract_upgrade_audit_logs (...);

-- Certified builds
CREATE TABLE certified_builds (...);
```

### Environment Variables

```env
# Contract Upgrade Configuration
CONTRACT_UPGRADE_MONITORING_INTERVAL=300000
CONTRACT_UPGRADE_PROPOSAL_EXPIRATION_HOURS=72
CONTRACT_UPGRADE_SIGNATURE_VALIDITY_HOURS=24
CONTRACT_UPGRADE_MAX_ACTIVE_PROPOSALS=3

# Alert Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SENTRY_DSN=https://your-sentry-dsn
```

### Service Dependencies

- **PostgreSQL** for audit and proposal storage
- **Slack** for alert notifications
- **Sentry** for error tracking
- **Stellar/Soroban** for blockchain operations

## Compliance and Governance

### Audit Trail

All upgrade operations are logged with:

- **Timestamp** of each action
- **Actor** performing the action
- **Previous state** before change
- **New state** after change
- **IP address** and user agent
- **Transaction hashes** for blockchain operations

### Regulatory Compliance

- **SEC Rule 144** compliance preservation
- **Investor protection** through immutable terms
- **Transparency** through public audit logs
- **Governance** through multi-sig requirements

### Risk Mitigation

- **Gradual rollout** with pilot testing
- **Rollback capability** for failed upgrades
- **Circuit breakers** for automated protection
- **Insurance coverage** for catastrophic failures

## Best Practices

### For Administrators

1. **Always verify** certified build status before proposing
2. **Test thoroughly** in staging environment
3. **Communicate clearly** with all stakeholders
4. **Monitor closely** during execution
5. **Document thoroughly** for compliance

### For Signers

1. **Review carefully** all proposal details
2. **Verify security** audit reports
3. **Confirm immutable terms** preservation
4. **Vote promptly** to avoid expiration
5. **Document reasoning** for voting decisions

### For Developers

1. **Follow security** best practices
2. **Maintain backward compatibility**
3. **Document all changes** thoroughly
4. **Test edge cases** comprehensively
5. **Coordinate with auditors** early

## Troubleshooting

### Common Issues

1. **Proposal stuck in pending status**
   - Check if signers have received notifications
   - Verify signature expiration times
   - Review multi-sig configuration

2. **WASM hash verification failure**
   - Confirm build is certified
   - Check security audit status
   - Verify hash format and length

3. **Upgrade execution failure**
   - Verify immutable terms unchanged
   - Check blockchain connectivity
   - Review executor permissions

### Support Channels

- **Technical support**: engineering@vesting-vault.com
- **Security issues**: security@vesting-vault.com
- **Compliance questions**: compliance@vesting-vault.com

## Future Enhancements

### Planned Features

1. **Automated rollback** for failed upgrades
2. **Cross-chain upgrade** support
3. **Advanced analytics** dashboard
4. **Mobile app** for signer approvals
5. **Integration with** external audit tools

### Scalability Improvements

1. **Horizontal scaling** for high-volume operations
2. **Caching layer** for performance optimization
3. **Load balancing** for API endpoints
4. **Database sharding** for large deployments

---

This implementation provides a robust, secure, and compliant framework for contract upgradeability that protects investor interests while enabling necessary protocol improvements.
