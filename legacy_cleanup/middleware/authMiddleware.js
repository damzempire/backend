const jwt = require('jsonwebtoken');
const { RBAC, ROLES } = require('../config/rbac');

class AuthMiddleware {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    }

    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required',
                message: 'Authorization token is required'
            });
        }

        jwt.verify(token, this.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid token',
                    message: 'Token is invalid or expired'
                });
            }

            req.user = decoded;
            next();
        });
    }

    requireRole(requiredRole) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'User must be authenticated'
                });
            }

            if (!RBAC.hasRole(req.user.role, requiredRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient privileges',
                    message: `Required role: ${requiredRole}, Current role: ${req.user.role}`
                });
            }

            next();
        };
    }

    requirePermission(permission) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'User must be authenticated'
                });
            }

            if (!RBAC.hasPermission(req.user.role, permission)) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient privileges',
                    message: `Required permission: ${permission}, Current role: ${req.user.role}`
                });
            }

            next();
        };
    }

    requireEndpointAccess() {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    message: 'User must be authenticated'
                });
            }

            const method = req.method;
            const path = req.route ? req.route.path : req.path;

            if (!RBAC.canAccessEndpoint(req.user.role, method, path)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: `Role ${req.user.role} cannot access ${method} ${path}`
                });
            }

            next();
        };
    }

    validateUserClaims(req, res, next) {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'User must be authenticated'
            });
        }

        // Validate required claims
        const requiredClaims = ['id', 'role', 'email'];
        const missingClaims = requiredClaims.filter(claim => !req.user[claim]);

        if (missingClaims.length > 0) {
            return res.status(403).json({
                success: false,
                error: 'Invalid token claims',
                message: `Missing required claims: ${missingClaims.join(', ')}`
            });
        }

        // Validate role is valid
        if (!RBAC.validateRole(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: 'Invalid role',
                message: `Role ${req.user.role} is not recognized`
            });
        }

        // Additional security checks
        if (req.user.exp && req.user.exp < Date.now() / 1000) {
            return res.status(403).json({
                success: false,
                error: 'Token expired',
                message: 'Authentication token has expired'
            });
        }

        next();
    }

    generateToken(payload) {
        const tokenPayload = {
            id: payload.id,
            email: payload.email,
            role: payload.role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };

        return jwt.sign(tokenPayload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
    }

    // Middleware for optional authentication (doesn't fail if no token)
    optionalAuth(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        jwt.verify(token, this.JWT_SECRET, (err, decoded) => {
            if (err) {
                req.user = null;
            } else {
                req.user = decoded;
            }
            next();
        });
    }
}

module.exports = new AuthMiddleware();
