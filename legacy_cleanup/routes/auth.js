const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { ROLES, PERMISSIONS } = require('../config/rbac');

const router = express.Router();

// Generate test token (for development/testing only)
router.post('/token/generate', (req, res) => {
    try {
        const { id, email, role } = req.body;
        
        if (!id || !email || !role) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'id, email, and role are required'
            });
        }

        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role',
                message: `Valid roles: ${Object.values(ROLES).join(', ')}`
            });
        }

        const token = authMiddleware.generateToken({ id, email, role });
        
        res.json({
            success: true,
            token,
            user: { id, email, role }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to generate token'
        });
    }
});

// Verify current token and return user info
router.get('/token/verify', authMiddleware.authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user,
        permissions: authMiddleware.getRolePermissions ? authMiddleware.getRolePermissions(req.user.role) : []
    });
});

// Get all available roles
router.get('/roles', (req, res) => {
    res.json({
        success: true,
        roles: Object.values(ROLES),
        roleHierarchy: {
            [ROLES.SUPER_ADMIN]: 'Full system control',
            [ROLES.FINANCE_MANAGER]: 'Withdrawal/Revenue operations',
            [ROLES.HR_MANAGER]: 'Onboarding/Metadata management',
            [ROLES.READ_ONLY_AUDITOR]: 'Read-only audit access'
        }
    });
});

// Get permissions for a specific role
router.get('/permissions/:role', (req, res) => {
    try {
        const { role } = req.params;
        
        if (!Object.values(ROLES).includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role',
                message: `Valid roles: ${Object.values(ROLES).join(', ')}`
            });
        }

        const { RBAC } = require('../config/rbac');
        const permissions = RBAC.getRolePermissions(role);
        
        res.json({
            success: true,
            role,
            permissions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            message: 'Failed to get permissions'
        });
    }
});

// Test endpoint to check RBAC functionality
router.get('/test-access', authMiddleware.authenticateToken, authMiddleware.validateUserClaims, (req, res) => {
    const { RBAC } = require('../config/rbac');
    
    const testResults = {
        user: req.user,
        rolePermissions: RBAC.getRolePermissions(req.user.role),
        canModifyVesting: RBAC.hasPermission(req.user.role, PERMISSIONS.MODIFY_VESTING_SCHEDULES),
        canInitiateWithdrawals: RBAC.hasPermission(req.user.role, PERMISSIONS.INITIATE_WITHDRAWALS),
        canOnboardUsers: RBAC.hasPermission(req.user.role, PERMISSIONS.ONBOARD_USERS),
        canViewAuditLogs: RBAC.hasPermission(req.user.role, PERMISSIONS.VIEW_AUDIT_LOGS),
        hasFullControl: RBAC.hasPermission(req.user.role, PERMISSIONS.FULL_SYSTEM_CONTROL)
    };
    
    res.json({
        success: true,
        ...testResults
    });
});

module.exports = router;
