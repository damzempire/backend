const ROLES = {
    SUPER_ADMIN: 'super_admin',
    FINANCE_MANAGER: 'finance_manager', 
    HR_MANAGER: 'hr_manager',
    READ_ONLY_AUDITOR: 'read_only_auditor'
};

const PERMISSIONS = {
    // Vesting Schedule Permissions
    VIEW_VESTING_SCHEDULES: 'view_vesting_schedules',
    MODIFY_VESTING_SCHEDULES: 'modify_vesting_schedules',
    
    // Financial Permissions
    INITIATE_WITHDRAWALS: 'initiate_withdrawals',
    APPROVE_WITHDRAWALS: 'approve_withdrawals',
    VIEW_REVENUE: 'view_revenue',
    MANAGE_REVENUE: 'manage_revenue',
    
    // HR/Onboarding Permissions
    ONBOARD_USERS: 'onboard_users',
    MANAGE_USER_METADATA: 'manage_user_metadata',
    VIEW_USER_DATA: 'view_user_data',
    
    // Audit Permissions
    VIEW_AUDIT_LOGS: 'view_audit_logs',
    EXPORT_AUDIT_LOGS: 'export_audit_logs',
    VERIFY_INTEGRITY: 'verify_integrity',
    
    // System Permissions
    FULL_SYSTEM_CONTROL: 'full_system_control',
    MANAGE_ROLES: 'manage_roles',
    SYSTEM_ADMINISTRATION: 'system_administration'
};

const ROLE_PERMISSIONS = {
    [ROLES.SUPER_ADMIN]: [
        // Full access to everything
        ...Object.values(PERMISSIONS)
    ],
    
    [ROLES.FINANCE_MANAGER]: [
        PERMISSIONS.VIEW_VESTING_SCHEDULES,
        PERMISSIONS.INITIATE_WITHDRAWALS,
        PERMISSIONS.APPROVE_WITHDRAWALS,
        PERMISSIONS.VIEW_REVENUE,
        PERMISSIONS.MANAGE_REVENUE,
        PERMISSIONS.VIEW_AUDIT_LOGS,
        PERMISSIONS.VERIFY_INTEGRITY
    ],
    
    [ROLES.HR_MANAGER]: [
        PERMISSIONS.VIEW_VESTING_SCHEDULES,
        PERMISSIONS.ONBOARD_USERS,
        PERMISSIONS.MANAGE_USER_METADATA,
        PERMISSIONS.VIEW_USER_DATA,
        PERMISSIONS.VIEW_AUDIT_LOGS
    ],
    
    [ROLES.READ_ONLY_AUDITOR]: [
        PERMISSIONS.VIEW_VESTING_SCHEDULES,
        PERMISSIONS.VIEW_USER_DATA,
        PERMISSIONS.VIEW_AUDIT_LOGS,
        PERMISSIONS.EXPORT_AUDIT_LOGS,
        PERMISSIONS.VERIFY_INTEGRITY
    ]
};

const ENDPOINT_PERMISSIONS = {
    // Audit endpoints
    'GET:/api/audit/verify': [PERMISSIONS.VERIFY_INTEGRITY],
    'GET:/api/audit/history': [PERMISSIONS.VIEW_AUDIT_LOGS],
    'POST:/api/audit/anchor': [PERMISSIONS.SYSTEM_ADMINISTRATION],
    'GET:/api/audit/stellar/account': [PERMISSIONS.SYSTEM_ADMINISTRATION],
    'GET:/api/audit/chain-integrity': [PERMISSIONS.VERIFY_INTEGRITY],
    'GET:/api/audit/daily-hashes': [PERMISSIONS.VIEW_AUDIT_LOGS],
    'POST:/api/audit/manual': [PERMISSIONS.SYSTEM_ADMINISTRATION],
    
    // Vesting endpoints
    'POST:/api/vesting/cliff-date': [PERMISSIONS.MODIFY_VESTING_SCHEDULES],
    'POST:/api/vesting/beneficiary': [PERMISSIONS.MODIFY_VESTING_SCHEDULES],
    'POST:/api/admin/action': [PERMISSIONS.SYSTEM_ADMINISTRATION]
};

class RBAC {
    static hasRole(userRole, requiredRole) {
        const roleHierarchy = {
            [ROLES.SUPER_ADMIN]: 4,
            [ROLES.FINANCE_MANAGER]: 3,
            [ROLES.HR_MANAGER]: 2,
            [ROLES.READ_ONLY_AUDITOR]: 1
        };
        
        return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
    }
    
    static hasPermission(userRole, permission) {
        const userPermissions = ROLE_PERMISSIONS[userRole] || [];
        return userPermissions.includes(permission);
    }
    
    static canAccessEndpoint(userRole, method, path) {
        const endpointKey = `${method}:${path}`;
        const requiredPermissions = ENDPOINT_PERMISSIONS[endpointKey];
        
        if (!requiredPermissions) {
            return false; // Default deny for unconfigured endpoints
        }
        
        return requiredPermissions.some(permission => 
            this.hasPermission(userRole, permission)
        );
    }
    
    static getRolePermissions(role) {
        return ROLE_PERMISSIONS[role] || [];
    }
    
    static validateRole(role) {
        return Object.values(ROLES).includes(role);
    }
}

module.exports = {
    ROLES,
    PERMISSIONS,
    ROLE_PERMISSIONS,
    ENDPOINT_PERMISSIONS,
    RBAC
};
