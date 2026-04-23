# Role-Based Access Control (RBAC) Implementation

## Overview
This implementation provides a comprehensive RBAC system for the Vesting Vault backend, preventing internal privilege escalation and ensuring granular access control.

## Features

### 🔐 Four Defined Roles
1. **SuperAdmin** - Full system control
2. **FinanceManager** - Withdrawal/Revenue operations only  
3. **HRManager** - Onboarding/Metadata management only
4. **ReadOnlyAuditor** - Read-only audit access

### 🛡️ Security Features
- JWT-based authentication with signed claims
- Granular permission system
- Endpoint-level access control
- Automatic audit logging with role tracking
- Prevention of internal privilege escalation

### 🔑 JWT Claims Structure
```json
{
  "id": "user-id",
  "email": "user@example.com", 
  "role": "finance_manager",
  "iat": 1234567890,
  "exp": 1234654290
}
```

## API Endpoints

### Authentication
- `POST /api/auth/token/generate` - Generate JWT token
- `GET /api/auth/token/verify` - Verify current token
- `GET /api/auth/roles` - List available roles
- `GET /api/auth/permissions/:role` - Get role permissions
- `GET /api/auth/test-access` - Test current user access

### Protected Endpoints (All require valid JWT)
- `GET /api/audit/*` - Audit endpoints (role-based access)
- `POST /api/vesting/cliff-date` - Modify vesting (SuperAdmin only)
- `POST /api/vesting/beneficiary` - Modify vesting (SuperAdmin only)
- `POST /api/admin/action` - Admin actions (SuperAdmin only)

## Role Permissions

### SuperAdmin
- ✅ Full system control
- ✅ Modify vesting schedules
- ✅ Manage all operations
- ✅ Access all audit functions

### FinanceManager  
- ✅ View vesting schedules
- ✅ Initiate/approve withdrawals
- ✅ Manage revenue
- ✅ View audit logs
- ❌ Modify vesting schedules
- ❌ User onboarding

### HRManager
- ✅ View vesting schedules
- ✅ Onboard users
- ✅ Manage user metadata
- ✅ View audit logs
- ❌ Modify vesting schedules
- ❌ Financial operations

### ReadOnlyAuditor
- ✅ View vesting schedules
- ✅ View audit logs
- ✅ Export audit logs
- ✅ Verify integrity
- ❌ Any modifications
- ❌ Financial operations

## Usage Examples

### Generate Token for HR Manager
```bash
curl -X POST "http://localhost:3000/api/auth/token/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "hr-manager-1",
    "email": "hr@company.com",
    "role": "hr_manager"
  }'
```

### Access Audit History as Finance Manager
```bash
curl "http://localhost:3000/api/audit/history" \
  -H "Authorization: Bearer <finance-manager-token>"
```

### Attempt Unauthorized Access (Will Fail)
```bash
curl -X POST "http://localhost:3000/api/vesting/cliff-date" \
  -H "Authorization: Bearer <hr-manager-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "beneficiaryId": "test-123",
    "previousCliffDate": "2024-01-01", 
    "newCliffDate": "2024-06-01"
  }'

# Response: 403 Forbidden - Insufficient privileges
```

## Security Implementation

### Middleware Chain
1. **Authentication** - Validate JWT token
2. **Claims Validation** - Verify required claims present
3. **RBAC Check** - Validate role-based endpoint access
4. **Audit Logging** - Log action with role information

### Prevention of Privilege Escalation
- All API requests validated against signed JWT claims
- Role hierarchy enforced at middleware level
- Audit logs track user ID and role for all actions
- No bypass mechanisms for role validation

### Audit Trail Enhancement
- All audit entries now include:
  - User role (`userRole`)
  - User ID (`userId`)
  - Original request metadata
  - Permission validation results

## Configuration

### Environment Variables
```bash
# RBAC Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h
```

## Testing

Comprehensive test suite covering:
- Token generation for all roles
- Permission validation
- Access control enforcement
- Unauthorized access prevention
- Role hierarchy verification

Run tests:
```bash
npm test
```

## Security Benefits

1. **Prevents Internal Privilege Escalation** - Junior employees cannot access founder-level functions
2. **Granular Access Control** - Each role has exactly the permissions needed
3. **Audit Trail** - All actions logged with role context
4. **JWT Security** - Cryptographically signed claims prevent tampering
5. **Defense in Depth** - Multiple validation layers

This implementation ensures that HR managers can view vesting schedules but cannot modify them, while maintaining comprehensive audit trails and preventing unauthorized access to critical system functions.
