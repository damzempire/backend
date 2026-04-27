/**
 * Security middleware: Helmet (CSP) + strict CORS
 * Resolves GitHub Issue #260
 */
const helmet = require('helmet');
const cors = require('cors');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Strict CORS — only the official frontend origin is allowed.
 */
const strictCors = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server, health checks)
    if (!origin) return callback(null, true);
    if (origin === FRONTEND_URL) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400, // 24 h preflight cache
});

/**
 * Helmet with a strict Content-Security-Policy.
 * Prevents XSS, clickjacking, MIME sniffing, and cross-site framing.
 */
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // inline styles needed for Swagger UI
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", FRONTEND_URL],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"], // equivalent to X-Frame-Options: DENY
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // keep false to avoid breaking Swagger UI assets
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

module.exports = { strictCors, helmetMiddleware };
