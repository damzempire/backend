# Multi-Signature Revocation Authorization Flow

## 🎯 Overview

The **Multi-Signature Revocation System** implements a critical security requirement for high-stakes token revocation actions. This "Digital Check-and-Balance" system ensures that no single administrator can unilaterally revoke tokens, requiring multiple authorized signatures before any revocation transaction is broadcast to the Soroban contract.

## 🚨 Business Criticality

Revoking tokens represents a **high-stakes action** that must never be controlled by a single person due to:

- **Financial Impact**: Millions of dollars in locked team equity
- **Legal Liability**: Unauthorized revocations could trigger legal action
- **Team Trust**: Multi-sig prevents unilateral decisions that damage team morale
- **Investor Confidence**: Demonstrates proper governance and control mechanisms
- **Regulatory Compliance**: Meets requirements for fund management systems

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Admin 1       │    │  Revocation      │    │   Soroban       │
│   (Proposer)    │───►│  Proposal        │───►│   Contract      │
│                 │    │                  │    │                 │
└─────────────────┘    │ • Collect        │    │ • Execute       │
                       │ • Validate       │    │ • Revoke        │
┌─────────────────┐    │ • Threshold      │    │                 │
│   Admin 2       │    │ • Broadcast      │    └─────────────────┘
│   (Signer)      │───►│                  │
│                 │    └──────────────────┘
└─────────────────┘             │
                                ▼
                       ┌─────────────────┐
                       │   Audit Trail   │
                       │                 │
                       │ • All Actions   │
                       │ • Signatures    │
                       │ • Timestamps    │
                       └─────────────────┘
```

## ⚙️ Core Components

### 1. Multi-Sig Configuration Model

**Configuration Parameters:**
```javascript
{
  vaultAddress: "0x1234...",           // Vault contract address
  requiredSignatures: 2,                // Minimum signatures needed
  totalSigners: 3,                      // Total authorized signers
  signers: [                             // Array of authorized addresses
    "0x1111...",                        // Admin 1
    "0x2222...",                        // Admin 2  
    "0x3333..."                         // Admin 3
  ],
  isActive: true,                       // Configuration status
  createdBy: "0x1111..."               // Who created the config
}
```

**Supported Thresholds:**
- **2-of-3**: Most common for team operations
- **3-of-5**: For larger organizations
- **2-of-5**: For distributed teams
- **Custom**: Any combination where `required ≤ total`

### 2. Revocation Proposal Model

**Proposal Lifecycle:**
```
PENDING → APPROVED → EXECUTED
    ↓         ↓         ↓
  Collect   Threshold  Transaction
 Signatures   Met      Broadcast
```

**Proposal Structure:**
```javascript
{
  id: "uuid-1234...",
  vaultAddress: "0x1234...",
  beneficiaryAddress: "0x9876...",
  amountToRevoke: "1000.000000000000000000",
  reason: "Violation of vesting terms",
  proposedBy: "0x1111...",
  status: "pending",                    // pending, approved, rejected, executed, failed
  requiredSignatures: 2,
  currentSignatures: 1,
  transactionHash: null,                // Set after execution
  expiresAt: "2026-03-26T22:15:00Z",   // 72-hour expiration
  createdAt: "2026-03-23T22:15:00Z"
}
```

### 3. Signature Collection Model

**Signature Verification:**
```javascript
{
  proposalId: "uuid-1234...",
  signerAddress: "0x2222...",
  signature: "0xabcdef...",              // Cryptographic signature
  signedAt: "2026-03-23T22:20:00Z",
  isValid: true
}
```

**Security Features:**
- **Cryptographic Verification**: Each signature is cryptographically verified
- **Uniqueness Enforcement**: One signature per signer per proposal
- **Timestamp Tracking**: Exact signing times recorded
- **Validity Status**: Invalid signatures can be flagged

## 🔄 Workflow Process

### Step 1: Multi-Sig Configuration Setup

**Initial Configuration:**
```javascript
// Admin creates multi-sig configuration
POST /api/admin/multi-sig/config
{
  "vaultAddress": "0x1234...",
  "signers": [
    "0x1111...",  // CEO
    "0x2222...",  // CTO
    "0x3333..."   // CFO
  ],
  "requiredSignatures": 2
}
```

**Validation Rules:**
- ✅ Vault address must be valid and exist
- ✅ At least 2 signatures required (no single control)
- ✅ Required signatures cannot exceed total signers
- ✅ All signer addresses must be valid
- ✅ Only one configuration per vault

### Step 2: Revocation Proposal Creation

**Proposal Initiation:**
```javascript
// Authorized signer creates proposal
POST /api/admin/multi-sig/proposal
{
  "vaultAddress": "0x1234...",
  "beneficiaryAddress": "0x9876...",
  "amountToRevoke": "1000.000000000000000000",
  "reason": "Material breach of contract"
}
```

**Automatic Processing:**
- ✅ Proposer automatically signs the proposal
- ✅ Proposal enters "pending" state
- ✅ 72-hour expiration timer starts
- ✅ Other signers are notified

**Security Checks:**
- ✅ Proposer must be authorized signer
- ✅ No duplicate pending proposals for same beneficiary
- ✅ Amount cannot exceed beneficiary's allocation
- ✅ Vault and beneficiary must exist

### Step 3: Signature Collection

**Signing Process:**
```javascript
// Other authorized signers review and sign
POST /api/admin/multi-sig/sign
{
  "proposalId": "uuid-1234...",
  "signature": "0xabcdef..."  // Cryptographic signature of proposal payload
}
```

**Real-time Updates:**
- ✅ Signature count updates immediately
- ✅ All signers notified of new signatures
- ✅ Status changes when threshold reached
- ✅ Automatic execution triggered on approval

**Validation Rules:**
- ✅ Signer must be authorized
- ✅ No duplicate signatures allowed
- ✅ Signature must be cryptographically valid
- ✅ Proposal must be in "pending" state
- ✅ Proposal cannot be expired

### Step 4: Threshold Validation & Execution

**Automatic Execution:**
```javascript
// When threshold reached:
if (signatureCount >= requiredSignatures) {
  proposal.status = "approved";
  await executeRevocation(proposalId);
}
```

**Transaction Broadcasting:**
- ✅ Multi-signature transaction constructed
- ✅ Broadcast to Soroban contract
- ✅ Transaction hash recorded
- ✅ Proposal status updated to "executed"
- ✅ All parties notified of completion

## 🛡️ Security Features

### Authorization Controls

**Multi-Layer Validation:**
1. **Configuration Level**: Only authorized signers can be configured
2. **Proposal Level**: Only authorized signers can create proposals
3. **Signature Level**: Each signature is individually verified
4. **Execution Level**: Automatic only after threshold validation

**Access Control Matrix:**
| Action | Admin 1 | Admin 2 | Admin 3 | Unauthorized |
|--------|---------|---------|---------|---------------|
| Create Config | ✅ | ❌ | ❌ | ❌ |
| Create Proposal | ✅ | ✅ | ✅ | ❌ |
| Sign Proposal | ✅ | ✅ | ✅ | ❌ |
| Execute Revocation | 🤖 | 🤖 | 🤖 | ❌ |

### Cryptographic Security

**Signature Verification:**
```javascript
// Proposal payload for signing
const payload = `Revocation Proposal
Proposal ID: ${proposal.id}
Vault: ${proposal.vaultAddress}
Beneficiary: ${proposal.beneficiaryAddress}
Amount: ${proposal.amountToRevoke}
Reason: ${proposal.reason}
Proposed by: ${proposal.proposedBy}
Created: ${proposal.createdAt}`;

// SHA-256 hash for signing
const hash = crypto.createHash('sha256').update(payload).digest('hex');
```

**Security Measures:**
- ✅ Each proposal has unique cryptographic payload
- ✅ Signatures are bound to specific proposal content
- ✅ Tamper-evident: Any change invalidates signatures
- ✅ Non-repudiation: Signers cannot deny signing

### Audit Trail

**Comprehensive Logging:**
```javascript
// Every action logged with full context
await auditLogger.log({
  action: 'CREATE_REVOCATION_PROPOSAL',
  actor: '0x1111...',
  target: '0x9876...',
  details: {
    proposalId: 'uuid-1234...',
    vaultAddress: '0x1234...',
    amountToRevoke: '1000.000000000000000000',
    reason: 'Breach of contract',
    requiredSignatures: 2
  },
  timestamp: '2026-03-23T22:15:00Z',
  ip: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});
```

**Audit Features:**
- ✅ All actions recorded with immutable timestamps
- ✅ Full context captured (who, what, when, where)
- ✅ Signature trail maintained
- ✅ Transaction hashes linked to proposals

## 📊 API Endpoints

### Configuration Management

**Create Multi-Sig Configuration:**
```http
POST /api/admin/multi-sig/config
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "vaultAddress": "0x1234567890123456789012345678901234567890",
  "signers": [
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
    "0x3333333333333333333333333333333333333333"
  ],
  "requiredSignatures": 2
}
```

**Get Configuration:**
```http
GET /api/admin/multi-sig/config/:vaultAddress
Authorization: Bearer <admin-token>
```

### Proposal Management

**Create Revocation Proposal:**
```http
POST /api/admin/multi-sig/proposal
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "vaultAddress": "0x1234567890123456789012345678901234567890",
  "beneficiaryAddress": "0x9876543210987654321098765432109876543210",
  "amountToRevoke": "1000.000000000000000000",
  "reason": "Material breach of vesting agreement"
}
```

**Get Proposal Details:**
```http
GET /api/admin/multi-sig/proposal/:proposalId
Authorization: Bearer <admin-token>
```

**Get Pending Proposals:**
```http
GET /api/admin/multi-sig/proposals/:vaultAddress
Authorization: Bearer <admin-token>
```

### Signature Collection

**Sign Proposal:**
```http
POST /api/admin/multi-sig/sign
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "proposalId": "uuid-1234-5678-9abc-def012345678",
  "signature": "0xabcdef1234567890abcdef1234567890abcdef12"
}
```

### Monitoring & Statistics

**Get Multi-Sig Statistics:**
```http
GET /api/admin/multi-sig/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "proposals": {
      "total": 15,
      "pending": 3,
      "approved": 8,
      "executed": 4,
      "failed": 0
    },
    "activeConfigs": 5
  }
}
```

## 🚨 Alert System

### Real-time Notifications

**Proposal Created:**
```markdown
🔐 **New Revocation Proposal Created**

**Proposal ID:** uuid-1234-5678-9abc-def012345678
**Vault:** 0x1234567890123456789012345678901234567890
**Beneficiary:** 0x9876543210987654321098765432109876543210
**Amount:** 1000.000000000000000000
**Proposed by:** 0x1111111111111111111111111111111111111111
**Required Signatures:** 2/3
**Expires:** 2026-03-26T22:15:00Z

**Action Required:** Please review and sign the proposal via dashboard.

**Other Signers:** 0x2222..., 0x3333...
```

**Threshold Reached:**
```markdown
✅ **Revocation Proposal Approved**

**Proposal ID:** uuid-1234-5678-9abc-def012345678
**Status:** Approved - Executing transaction
**Signatures Collected:** 2/2
**Final Signer:** 0x3333333333333333333333333333333333333333

**Next:** Transaction will be broadcast to Soroban contract shortly.
```

**Execution Completed:**
```markdown
🎯 **Revocation Executed Successfully**

**Proposal ID:** uuid-1234-5678-9abc-def012345678
**Transaction Hash:** 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
**Executed At:** 2026-03-23T22:25:00Z

**Details:**
- Vault: 0x1234...
- Beneficiary: 0x9876...
- Amount: 1000.000000000000000000
- Signers: 0x1111..., 0x3333...

All required signatures were collected and the revocation is complete.
```

## 📈 Dashboard Integration

### Admin Dashboard Views

**Multi-Sig Overview:**
- Active configurations per vault
- Pending proposals requiring attention
- Recent executed revocations
- Signature collection progress

**Proposal Management:**
- Create new revocation proposals
- View proposal details and status
- Sign pending proposals
- Track execution progress

**Configuration Management:**
- Set up multi-sig for new vaults
- Modify signer lists (requires new proposal)
- View configuration history
- Monitor active vs inactive configs

### Real-time Updates

**WebSocket Integration:**
```javascript
// Real-time proposal updates
ws.on('proposalUpdate', (data) => {
  updateProposalUI(data.proposalId, data.status);
});

// Signature notifications
ws.on('signatureAdded', (data) => {
  showSignatureNotification(data.proposalId, data.signer);
});

// Execution completion
ws.on('proposalExecuted', (data) => {
  showExecutionResult(data.proposalId, data.transactionHash);
});
```

## 🧪 Testing & Validation

### Comprehensive Test Suite

**Test Coverage:**
- ✅ Multi-sig configuration creation and validation
- ✅ Revocation proposal workflow
- ✅ Signature collection and threshold validation
- ✅ Automatic proposal execution
- ✅ Pending proposals management
- ✅ Statistics and reporting
- ✅ Edge cases and error handling
- ✅ Security features and validation

**Test Execution:**
```bash
cd backend
node test-multi-sig-revocation.js

# Expected output
🚀 Starting Multi-Signature Revocation Tests...
✅ Multi-sig config created
✅ Revocation proposal created
✅ Signature collection working
✅ Proposal execution completed
🎉 All Multi-Signature Revocation tests passed!
```

### Security Testing

**Authorization Tests:**
- Unauthorized users cannot access endpoints
- Invalid signatures are rejected
- Duplicate signatures are prevented
- Expired proposals cannot be signed

**Cryptographic Tests:**
- Signature verification accuracy
- Payload integrity validation
- Hash collision resistance
- Non-repudiation verification

## 🔧 Configuration

### Environment Setup

**Required Environment Variables:**
```bash
# Multi-Sig Configuration
MULTI_SIG_DEFAULT_REQUIRED=2          # Default required signatures
MULTI_SIG_DEFAULT_TOTAL=3              # Default total signers
MULTI_SIG_EXPIRATION_HOURS=72          # Proposal expiration time
MULTI_SIG_SIGNATURE_VALIDITY_HOURS=24 # Signature validity period

# Security Configuration
ENABLE_SIGNATURE_VERIFICATION=true    # Enable cryptographic verification
STRICT_ADDRESS_VALIDATION=true        # Strict address format validation
AUDIT_LOGGING_ENABLED=true             # Enable comprehensive audit logging

# Notification Configuration
SLACK_MULTI_SIG_WEBHOOK=https://hooks.slack.com/services/...
ENABLE_REAL_TIME_NOTIFICATIONS=true    # Real-time signer notifications
```

### Database Configuration

**PostgreSQL Schema:**
```sql
-- Multi-sig configurations
CREATE TABLE multi_sig_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_address VARCHAR(42) NOT NULL UNIQUE,
    required_signatures INTEGER NOT NULL DEFAULT 2,
    total_signers INTEGER NOT NULL DEFAULT 3,
    signers JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(42) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revocation proposals
CREATE TABLE revocation_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_address VARCHAR(42) NOT NULL,
    beneficiary_address VARCHAR(42) NOT NULL,
    amount_to_revoke DECIMAL(36,18) NOT NULL,
    reason TEXT NOT NULL,
    proposed_by VARCHAR(42) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    required_signatures INTEGER NOT NULL DEFAULT 2,
    current_signatures INTEGER NOT NULL DEFAULT 0,
    transaction_hash VARCHAR(66),
    executed_at TIMESTAMP,
    expires_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Collected signatures
CREATE TABLE revocation_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES revocation_proposals(id) ON DELETE CASCADE,
    signer_address VARCHAR(42) NOT NULL,
    signature TEXT NOT NULL,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment Considerations

### Production Setup

**Security Requirements:**
- ✅ All admin endpoints require JWT authentication
- ✅ Multi-factor authentication for admin accounts
- ✅ IP whitelisting for admin dashboard access
- ✅ Regular security audits of signer addresses
- ✅ Backup and recovery procedures for configurations

**Performance Considerations:**
- ✅ Database indexes for efficient querying
- ✅ Caching of frequently accessed configurations
- ✅ Background job processing for transaction execution
- ✅ Monitoring of proposal expiration times
- ✅ Load balancing for high-traffic scenarios

**Monitoring & Alerting:**
```yaml
# Prometheus metrics
multi_sig_proposals_total{status="pending"}
multi_sig_signatures_total{status="valid"}
multi_sig_executions_total{status="success"}
multi_sig_configurations_active

# Alert rules
- alert: MultiSigProposalStuck
  expr: multi_sig_proposals_pending > 0
  for: 24h
  labels: { severity: warning }
  
- alert: MultiSigExecutionFailed
  expr: increase(multi_sig_executions_failed[1h]) > 0
  labels: { severity: critical }
```

## 📋 Best Practices

### Operational Guidelines

1. **Configuration Management**
   - Regularly review authorized signer lists
   - Update configurations when team members change
   - Maintain backup signer lists for emergency situations
   - Document all configuration changes

2. **Proposal Management**
   - Create clear, specific reasons for revocation
   - Provide supporting documentation when possible
   - Review proposals promptly to avoid expiration
   - Maintain communication with all signers

3. **Security Practices**
   - Use hardware wallets for signer addresses
   - Implement multi-factor authentication
   - Regular security training for all signers
   - Monitor for unusual proposal patterns

### Governance Recommendations

**Team Structure:**
- **2-of-3**: Small teams (CEO, CTO, CFO)
- **3-of-5**: Medium teams (CEO, CTO, CFO, CCO, Independent Director)
- **Custom**: Based on organizational structure and risk tolerance

**Escalation Procedures:**
- Define clear escalation paths for disputed proposals
- Establish timeline for signature collection
- Create procedures for emergency revocations
- Document decision-making processes

## 🔍 Troubleshooting

### Common Issues

**Issue: Proposal stuck in pending state**
```bash
# Check proposal status
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/admin/multi-sig/proposal/:id

# Verify signers have been notified
# Check Slack webhook delivery
# Review signer authentication status
```

**Issue: Signature verification failing**
```bash
# Verify proposal payload integrity
# Check signer address format
# Validate signature format
# Review cryptographic implementation
```

**Issue: Transaction execution failing**
```bash
# Check Soroban contract status
# Verify vault configuration
# Review transaction construction
# Check network connectivity
```

### Debug Mode

**Enable Detailed Logging:**
```bash
# Set debug environment
DEBUG=multi-sig:* node src/index.js

# Check proposal creation
curl -X POST http://localhost:4000/api/admin/multi-sig/proposal \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"vaultAddress":"0x1234...","beneficiaryAddress":"0x9876...","amountToRevoke":"1000","reason":"Debug test"}'
```

## 🔄 Future Enhancements

### Planned Features

1. **Advanced Governance**
   - Proposal voting with different weights
   - Time-locked signatures
   - Conditional approvals
   - Delegation of signing authority

2. **Enhanced Security**
   - Hardware wallet integration
   - Multi-factor signature requirements
   - Biometric authentication options
   - Quantum-resistant signature schemes

3. **Workflow Automation**
   - Smart contract integration
   - Automated compliance checks
   - Integration with legal systems
   - Advanced reporting capabilities

4. **Cross-Chain Support**
   - Multi-chain revocation support
   - Cross-chain signature aggregation
   - Interoperability standards
   - Bridge contract integration

---

## 📞 Support

For issues with the Multi-Signature Revocation System:

1. **Check Configuration**: Verify multi-sig setup is correct
2. **Review Logs**: Check service and error logs
3. **Test Signatures**: Verify signature generation process
4. **Run Test Suite**: Execute `node test-multi-sig-revocation.js`
5. **Contact Team**: Escalate critical issues immediately

**Remember**: This is a **critical security system** for managing millions in team equity. Any issues with signature collection or proposal execution should be investigated immediately to prevent business disruption.

---

## ⚖️ Legal & Compliance

**Important Notes:**
- This system implements proper governance controls
- All actions are logged for audit purposes
- Multi-sig prevents unilateral decision making
- Complies with fund management best practices
- Meets requirements for investor protection

**Disclaimer**: This system should be reviewed by legal counsel to ensure compliance with applicable regulations in your jurisdiction.
