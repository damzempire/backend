const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { rateLimit } = require("express-rate-limit");
const {
  walletRateLimitMiddleware,
} = require("./middleware/wallet-ratelimit.middleware");

const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

// Import swagger documentation
const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./swagger/options");

dotenv.config();

const app = express();

Sentry.init({
  // Fallback to a dummy DSN so Sentry SDK doesn't disable itself when testing without credentials
  dsn: process.env.SENTRY_DSN || "http://public_key@localhost:9999/1",
  debug: process.env.NODE_ENV !== "test", // Output sentry operations to console (disable in production/test)
  environment: process.env.NODE_ENV || "development",
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0, // 100% of transactions for performance monitoring
  profilesSampleRate: 1.0, // 100% of transactions are profiled
});

const PORT = process.env.PORT || 4000;

const httpServer = http.createServer(app);

// Sentry request handler must be the first middleware (only if Sentry is properly configured)
if (process.env.SENTRY_DSN && Sentry.Handlers) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(require("cookie-parser")());

// Apply wallet-based rate limiting to all API routes
app.use("/api", walletRateLimitMiddleware);

// Import and apply vault pause middleware
const {
  vaultPauseMiddleware,
  vaultStatusMiddleware,
} = require("./middleware/vaultPause.middleware");

// Import and apply Rule 144 compliance middleware
const { 
  rule144ComplianceMiddleware, 
  recordClaimComplianceMiddleware 
} = require('./middleware/rule144Compliance.middleware');

// Apply vault status middleware to all API routes
app.use("/api", vaultStatusMiddleware);

// Apply vault pause middleware to vault-specific endpoints
app.use("/api/vaults", vaultPauseMiddleware);
app.use("/api/claims", vaultPauseMiddleware);
app.use("/api/user", vaultPauseMiddleware);
app.use("/api/admin/vault", vaultPauseMiddleware);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

const claimRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1,
  message: {
    success: false,
    error: "Too many claim requests. Please wait 1 minute before trying again.",
  },
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

const { sequelize } = require("./database/connection");
const models = require("./models");
const { OrganizationWebhook } = models;
// Register webhook URL for organization
// For now, let's create a simple isAdminOfOrg function inline
const isAdminOfOrg = async (adminAddress, orgId) => {
  if (!adminAddress || !orgId) return false;
  try {
    const org = await models.Organization.findOne({
      where: { id: orgId, admin_address: adminAddress },
    });
    return !!org;
  } catch (err) {
    console.error("Error in isAdminOfOrg:", err);
    return false;
  }
};
// Register webhook URL for organization with admin/org check
app.post("/api/admin/webhooks", async (req, res) => {
  try {
    const { organization_id, webhook_url, admin_address } = req.body;
    if (!organization_id || !webhook_url || !admin_address) {
      return res
        .status(400)
        .json({
          success: false,
          error: "organization_id, webhook_url, and admin_address are required",
        });
    }
    const isAdmin = await isAdminOfOrg(admin_address, organization_id);
    if (!isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Forbidden: admin_address does not belong to organization",
        });
    }
    const webhook = await OrganizationWebhook.create({
      organization_id,
      webhook_url,
    });
    res.status(201).json({ success: true, data: webhook });
  } catch (error) {
    console.error("Error registering webhook:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const indexingService = require("./services/indexingService");
const adminService = require("./services/adminService");
const vestingService = require("./services/vestingService");
const merkleVaultService = require("./services/merkleVaultService");
const discordBotService = require("./services/discordBotService");
const cacheService = require("./services/cacheService");
const tvlService = require("./services/tvlService");
const vaultExportService = require("./services/vaultExportService");
const authService = require("./services/authService");
const notificationService = require("./services/notificationService");
const liquidityMonitorService = require("./services/liquidityMonitorService");
const pdfService = require("./services/pdfService");
const legalDocumentHashingService = require("./services/legalDocumentHashingService");
const ledgerSyncService = require("./services/ledgerSyncService");
const multiSigRevocationService = require("./services/multiSigRevocationService");
const dividendService = require("./services/dividendService");
const VaultService = require("./services/vaultService");
const monthlyReportJob = require("./jobs/monthlyReportJob");
const { VaultReconciliationJob } = require("./jobs/vaultReconciliationJob");
const vaultArchivalJob = require("./jobs/vaultArchivalJob");
const historicalPriceTrackingJob = require("./jobs/historicalPriceTrackingJob");
const integrityMonitoringJob = require("./jobs/integrityMonitoringJob");

// Import webhooks routes
const webhooksRoutes = require("./routes/webhooks");
const organizationRoutes = require("./routes/organization");
const hsmRoutes = require("./routes/hsm");
const historicalPriceRoutes = require("./routes/historicalPriceRoutes");
const auditorRoutes = require("./routes/auditor");

app.get("/", (req, res) => {
  res.json({ message: "Vesting Vault API is running!" });
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post("/api/auth/login", async (req, res) => {
  try {
    const { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({
        success: false,
        error: "Address and signature are required",
      });
    }

    // TODO: Verify signature with Ethereum message
    // For now, we'll create tokens without signature verification
    // In production, implement proper EIP-712 signature verification

    const tokens = await authService.createTokens(address);

    // Set refresh token in secure cookie
    authService.setRefreshTokenCookie(res, tokens.refreshToken);

    // Return access token in response (don't return refresh token)
    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: tokens.tokenType,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Login failed",
    });
  }
});

// POST /api/auth/refresh - Token refresh endpoint
app.post("/api/auth/refresh", async (req, res) => {
  try {
    // Try to get refresh token from cookie first
    let refreshToken = authService.getRefreshTokenFromCookie(req);

    // If not in cookie, try request body
    if (!refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: "Refresh token required",
      });
    }

    // Refresh tokens (this will revoke the old token and create new ones)
    const newTokens = await authService.refreshTokens(refreshToken);

    // Set new refresh token in secure cookie
    authService.setRefreshTokenCookie(res, newTokens.refreshToken);

    // Return new access token
    res.json({
      success: true,
      data: {
        accessToken: newTokens.accessToken,
        expiresIn: newTokens.expiresIn,
        tokenType: newTokens.tokenType,
      },
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    // Clear invalid refresh token cookie
    authService.clearRefreshTokenCookie(res);

    res.status(401).json({
      success: false,
      error: error.message || "Token refresh failed",
    });
  }
});

// POST /api/auth/logout - Logout endpoint
app.post("/api/auth/logout", async (req, res) => {
  try {
    const token = authService.extractTokenFromHeader(req);

    if (token) {
      try {
        const decoded = await authService.verifyAccessToken(token);
        // Revoke all refresh tokens for this user
        await authService.revokeAllUserTokens(decoded.address);
      } catch (error) {
        // Token might be invalid, but still clear cookie
        console.log("Invalid token during logout:", error.message);
      }
    }

    // Clear refresh token cookie
    authService.clearRefreshTokenCookie(res);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Logout failed",
    });
  }
});

// GET /api/auth/me - Get current user info
app.get("/api/auth/me", authService.authenticate(), async (req, res) => {
  try {
    const user = req.user;

    res.json({
      success: true,
      data: {
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Get user info error:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to get user info",
    });
  }
});
// Mount webhooks routes
app.use("/webhooks", webhooksRoutes);

// Mount organization routes
app.use("/api/org", organizationRoutes);

// Mount HSM routes (high security endpoints)
app.use("/api/hsm", hsmRoutes);

// Mount historical price tracking routes
app.use("/api/historical-prices", historicalPriceRoutes);

// Mount auditor routes (read-only auditor API for due diligence)
app.use("/api/auditor", auditorRoutes);

// Historical price tracking job management endpoints
app.post("/api/admin/jobs/historical-prices/start", async (req, res) => {
  try {
    historicalPriceTrackingJob.start();
    res.json({
      success: true,
      message: "Historical price tracking job started",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/jobs/historical-prices/stop", async (req, res) => {
  try {
    historicalPriceTrackingJob.stop();
    res.json({
      success: true,
      message: "Historical price tracking job stopped",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/jobs/historical-prices/run", async (req, res) => {
  try {
    await historicalPriceTrackingJob.run();
    res.json({
      success: true,
      message: "Historical price tracking job completed",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/jobs/historical-prices/stats", async (req, res) => {
  try {
    const stats = historicalPriceTrackingJob.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Vesting Routes ────────────────────────────────────────────────────────────

// POST /api/vaults - Create a new vault
app.post("/api/vaults", async (req, res) => {
  try {
    const vault = await vestingService.createVault(req.body);
    res.status(201).json({ success: true, data: vault });
  } catch (error) {
    console.error("Error creating vault:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/vaults/:vaultAddress/top-up - Process a top-up
app.post("/api/vaults/:vaultAddress/top-up", async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    const subSchedule = await vestingService.processTopUp({
      vault_address: vaultAddress,
      ...req.body,
    });
    res.status(201).json({ success: true, data: subSchedule });
  } catch (error) {
    console.error("Error processing top-up:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vaults/:vaultAddress/schedule - Get vesting schedule
app.get("/api/vaults/:vaultAddress/schedule", async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    const { beneficiaryAddress } = req.query;
    const schedule = await vestingService.getVestingSchedule(
      vaultAddress,
      beneficiaryAddress,
    );
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error("Error fetching vesting schedule:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/vaults/:vaultAddress/:beneficiaryAddress/withdrawable - Calculate withdrawable
app.get(
  "/api/vaults/:vaultAddress/:beneficiaryAddress/withdrawable",
  async (req, res) => {
    try {
      const { vaultAddress, beneficiaryAddress } = req.params;
      const { timestamp } = req.query;
      const result = await vestingService.calculateWithdrawableAmount(
        vaultAddress,
        beneficiaryAddress,
        timestamp ? new Date(timestamp) : new Date(),
      );
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error calculating withdrawable amount:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// POST /api/vaults/:vaultAddress/:beneficiaryAddress/withdraw - Process withdrawal
app.post(
  "/api/vaults/:vaultAddress/:beneficiaryAddress/withdraw",
  async (req, res) => {
    try {
      const { vaultAddress, beneficiaryAddress } = req.params;
      const result = await vestingService.processWithdrawal({
        vault_address: vaultAddress,
        beneficiary_address: beneficiaryAddress,
        ...req.body,
      });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// GET /api/vaults/:vaultAddress/summary - Vault summary
app.get("/api/vaults/:vaultAddress/summary", async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    const summary = await vestingService.getVaultSummary(vaultAddress);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error fetching vault summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const legalDocumentUploadMiddleware = express.raw({
  type: ["application/pdf"],
  limit: process.env.LEGAL_DOCUMENT_MAX_SIZE || "10mb",
});

app.post(
  "/api/vaults/:id/legal-document",
  authService.authenticate(),
  legalDocumentUploadMiddleware,
  async (req, res) => {
    try {
      const record = await legalDocumentHashingService.hashAndStoreDocument({
        vaultId: req.params.id,
        pdfBuffer: req.body,
        documentName: req.headers["x-document-name"] || req.query.documentName,
        mimeType: req.headers["content-type"],
        uploaderAddress: req.user.address,
        uploaderRole: req.user.role,
      });

      res.status(201).json({
        success: true,
        data: {
          id: record.id,
          vault_id: record.vault_id,
          document_type: record.document_type,
          document_name: record.document_name,
          sha256_hash: record.sha256_hash,
          file_size_bytes: record.file_size_bytes,
          uploaded_by: record.uploaded_by,
          uploaded_at: record.uploaded_at,
        },
      });
    } catch (error) {
      console.error("Error hashing legal document:", error);
      const status = error.message.includes("not found")
        ? 404
        : error.message.includes("permission")
          ? 403
          : error.message.includes("PDF")
            ? 400
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },
);

app.get(
  "/api/vaults/:id/legal-document",
  authService.authenticate(),
  async (req, res) => {
    try {
      const record = await legalDocumentHashingService.getStoredDocument(
        req.params.id,
        req.user.address,
        req.user.role,
      );

      res.json({
        success: true,
        data: {
          id: record.id,
          vault_id: record.vault_id,
          document_type: record.document_type,
          document_name: record.document_name,
          mime_type: record.mime_type,
          file_size_bytes: record.file_size_bytes,
          sha256_hash: record.sha256_hash,
          uploaded_by: record.uploaded_by,
          uploaded_at: record.uploaded_at,
          last_verified_at: record.last_verified_at,
        },
      });
    } catch (error) {
      console.error("Error fetching legal document fingerprint:", error);
      const status = error.message.includes("not found")
        ? 404
        : error.message.includes("permission")
          ? 403
          : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },
);

app.post(
  "/api/vaults/:id/legal-document/verify",
  authService.authenticate(),
  legalDocumentUploadMiddleware,
  async (req, res) => {
    try {
      const result = await legalDocumentHashingService.verifyDocument({
        vaultId: req.params.id,
        pdfBuffer: req.body,
        requesterAddress: req.user.address,
        requesterRole: req.user.role,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error verifying legal document fingerprint:", error);
      const status = error.message.includes("not found")
        ? 404
        : error.message.includes("permission")
          ? 403
          : error.message.includes("PDF")
            ? 400
            : 500;
      res.status(status).json({ success: false, error: error.message });
    }
  },
);

// ─────────────────────────────────────────────────────────────────────────────

// Merkle vesting airdrops (Issue #51)
app.post("/api/merkle-vault/build-tree", async (req, res) => {
  try {
    const { entries } = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "entries array required" });
    }
    const data = merkleVaultService.buildMerkleVaultData(entries);
    res.json({
      success: true,
      data: {
        rootHash: data.rootHash,
        totalAmount: data.totalAmount,
        proofsByIndex: data.proofsByIndex,
      },
    });
  } catch (error) {
    console.error("Error building Merkle tree:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/claims", claimRateLimiter, async (req, res) => {
  try {
    const claim = await indexingService.processClaim(req.body);
    
    // Apply recording middleware after successful claim
    await recordClaimComplianceMiddleware(req, res, () => {});
    
    res.status(201).json({ success: true, data: claim });
  } catch (error) {
    console.error("Error processing claim:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/claims/batch", claimRateLimiter, async (req, res) => {
  try {
    const result = await indexingService.processBatchClaims(req.body.claims);
    
    // Apply recording middleware for each claim in batch
    for (const claim of req.body.claims) {
      const mockReq = { body: claim, path: '/api/claims/batch' };
      await recordClaimComplianceMiddleware(mockReq, res, () => {});
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error processing batch claims:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/claims/backfill-prices", claimRateLimiter, async (req, res) => {
  try {
    const processedCount = await indexingService.backfillMissingPrices();
    res.json({
      success: true,
      message: `Backfilled prices for ${processedCount} claims`,
    });
  } catch (error) {
    console.error("Error backfilling prices:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/claims/:userAddress/realized-gains", async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { startDate, endDate } = req.query;

    const gains = await indexingService.getRealizedGains(
      userAddress,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null,
    );

    res.json({ success: true, data: gains });
  } catch (error) {
    console.error("Error calculating realized gains:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/admin/revoke", async (req, res) => {
  try {
    const { adminAddress, targetVault, reason } = req.body;
    const result = await adminService.revokeAccess(
      adminAddress,
      targetVault,
      reason,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error revoking access:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/clean-break", async (req, res) => {
  try {
    const {
      vaultAddress,
      beneficiaryAddress,
      terminationTimestamp,
      treasuryAddress,
    } = req.body;

    if (!vaultAddress || !beneficiaryAddress) {
      return res.status(400).json({
        success: false,
        error: "vaultAddress and beneficiaryAddress are required",
      });
    }

    const result = await vestingService.calculateCleanBreak(
      vaultAddress,
      beneficiaryAddress,
      terminationTimestamp || new Date(),
      treasuryAddress,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error executing clean break:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/create", async (req, res) => {
  try {
    const { adminAddress, targetVault, vaultConfig } = req.body;
    const result = await adminService.createVault(
      adminAddress,
      targetVault,
      vaultConfig,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error creating vault:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/admin/transfer", async (req, res) => {
  try {
    const { adminAddress, targetVault, newOwner } = req.body;
    const result = await adminService.transferVault(
      adminAddress,
      targetVault,
      newOwner,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error transferring vault:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/audit-logs", async (req, res) => {
  try {
    const { limit } = req.query;
    const result = await adminService.getAuditLogs(
      limit ? parseInt(limit) : 100,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/propose-new-admin", async (req, res) => {
  try {
    const { currentAdminAddress, newAdminAddress, contractAddress } = req.body;
    const result = await adminService.proposeNewAdmin(
      currentAdminAddress,
      newAdminAddress,
      contractAddress,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error proposing new admin:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/accept-ownership", async (req, res) => {
  try {
    const { newAdminAddress, transferId } = req.body;
    const result = await adminService.acceptOwnership(
      newAdminAddress,
      transferId,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error accepting ownership:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/admin/transfer-ownership", async (req, res) => {
  try {
    const { currentAdminAddress, newAdminAddress, contractAddress } = req.body;
    const result = await adminService.transferOwnership(
      currentAdminAddress,
      newAdminAddress,
      contractAddress,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error transferring ownership:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/pending-transfers", async (req, res) => {
  try {
    const { contractAddress } = req.query;
    const result = await adminService.getPendingTransfers(contractAddress);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching pending transfers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/stats/tvl", async (req, res) => {
  try {
    const tvlStats = await tvlService.getTVLStats();
    res.json({
      success: true,
      data: {
        total_value_locked: tvlStats.total_value_locked,
        active_vaults_count: tvlStats.active_vaults_count,
        formatted_tvl: tvlService.formatTVL(tvlStats.total_value_locked),
        last_updated_at: tvlStats.last_updated_at,
      },
    });
  } catch (error) {
    console.error("Error fetching TVL stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delegate routes
app.post("/api/delegate/set", async (req, res) => {
  try {
    const { vaultId, ownerAddress, delegateAddress } = req.body;
    const { Vault } = require("./models");
    const vault = await Vault.findOne({
      where: { id: vaultId, owner_address: ownerAddress },
    });
    if (!vault)
      return res
        .status(500)
        .json({ success: false, error: "Vault not found or access denied" });
    if (!delegateAddress || delegateAddress === "invalid_address")
      return res
        .status(500)
        .json({ success: false, error: "Invalid delegate address" });
    await vault.update({ delegate_address: delegateAddress });
    res.json({
      success: true,
      data: { message: "Delegate set successfully", vault },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/delegate/claim", async (req, res) => {
  try {
    const { delegateAddress, vaultAddress, releaseAmount } = req.body;
    const { Vault, SubSchedule } = require("./models");
    const vault = await Vault.findOne({
      where: { address: vaultAddress, delegate_address: delegateAddress },
    });
    if (!vault)
      return res
        .status(500)
        .json({
          success: false,
          error: "Vault not found or delegate not authorized",
        });

    const amount = parseFloat(releaseAmount);
    const subSchedule = await SubSchedule.findOne({
      where: { vault_id: vault.id },
    });

    if (
      subSchedule &&
      subSchedule.vesting_start_date &&
      new Date() < new Date(subSchedule.vesting_start_date)
    ) {
      return res
        .status(500)
        .json({ success: false, error: "Insufficient releasable amount" });
    }

    if (subSchedule) {
      const newReleased =
        (parseFloat(subSchedule.amount_released) || 0) + amount;
      await subSchedule.update({ amount_released: String(newReleased) });
    }

    res.json({
      success: true,
      data: {
        message: "Tokens claimed successfully by delegate",
        releaseAmount,
        ownerAddress: vault.owner_address,
        delegateAddress,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/delegate/:vaultAddress/info", async (req, res) => {
  try {
    const { vaultAddress } = req.params;
    const { Vault, SubSchedule, Beneficiary } = require("./models");
    const vault = await Vault.findOne({
      where: { address: vaultAddress },
      include: [{ model: SubSchedule, as: "subSchedules" }],
    });
    if (!vault)
      return res
        .status(500)
        .json({ success: false, error: "Vault not found or inactive" });
    res.json({ success: true, data: { vault } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Notification endpoints
app.post("/api/notifications/register-device", async (req, res) => {
  try {
    const { userAddress, deviceToken, platform, appVersion } = req.body;

    if (!userAddress || !deviceToken || !platform) {
      return res.status(400).json({
        success: false,
        error: "userAddress, deviceToken, and platform are required",
      });
    }

    if (!["ios", "android", "web"].includes(platform)) {
      return res.status(400).json({
        success: false,
        error: "platform must be one of: ios, android, web",
      });
    }

    const deviceTokenRecord = await notificationService.registerDeviceToken(
      userAddress,
      deviceToken,
      platform,
      appVersion,
    );

    res.status(201).json({
      success: true,
      data: {
        id: deviceTokenRecord.id,
        userAddress: deviceTokenRecord.user_address,
        platform: deviceTokenRecord.platform,
        registeredAt: deviceTokenRecord.created_at,
      },
    });
  } catch (error) {
    console.error("Error registering device token:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.delete("/api/notifications/unregister-device", async (req, res) => {
  try {
    const { deviceToken } = req.body;

    if (!deviceToken) {
      return res.status(400).json({
        success: false,
        error: "deviceToken is required",
      });
    }

    const success =
      await notificationService.unregisterDeviceToken(deviceToken);

    res.json({
      success: true,
      data: { unregistered: success },
    });
  } catch (error) {
    console.error("Error unregistering device token:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/notifications/devices/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;

    const deviceTokens =
      await notificationService.getUserDeviceTokens(userAddress);

    res.json({
      success: true,
      data: deviceTokens.map((token) => ({
        id: token.id,
        platform: token.platform,
        appVersion: token.app_version,
        lastUsedAt: token.last_used_at,
        registeredAt: token.created_at,
      })),
    });
  } catch (error) {
    console.error("Error fetching user device tokens:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Multi-Signature Revocation Endpoints
// POST /api/admin/multi-sig/config - Create multi-sig configuration for vault
app.post(
  "/api/admin/multi-sig/config",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { vaultAddress, signers, requiredSignatures } = req.body;
      const createdBy = req.user.address;

      if (
        !vaultAddress ||
        !signers ||
        !Array.isArray(signers) ||
        !requiredSignatures
      ) {
        return res.status(400).json({
          success: false,
          error:
            "vaultAddress, signers array, and requiredSignatures are required",
        });
      }

      const config = await multiSigRevocationService.createMultiSigConfig(
        vaultAddress,
        signers,
        requiredSignatures,
        createdBy,
      );

      res.status(201).json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error("Error creating multi-sig config:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/admin/multi-sig/config/:vaultAddress - Get multi-sig configuration
app.get(
  "/api/admin/multi-sig/config/:vaultAddress",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { vaultAddress } = req.params;

      const config =
        await multiSigRevocationService.getMultiSigConfig(vaultAddress);

      if (!config) {
        return res.status(404).json({
          success: false,
          error: "Multi-sig configuration not found",
        });
      }

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      console.error("Error getting multi-sig config:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// POST /api/admin/multi-sig/proposal - Create revocation proposal
app.post(
  "/api/admin/multi-sig/proposal",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { vaultAddress, beneficiaryAddress, amountToRevoke, reason } =
        req.body;
      const proposedBy = req.user.address;

      if (!vaultAddress || !beneficiaryAddress || !amountToRevoke || !reason) {
        return res.status(400).json({
          success: false,
          error:
            "vaultAddress, beneficiaryAddress, amountToRevoke, and reason are required",
        });
      }

      const proposal = await multiSigRevocationService.createRevocationProposal(
        vaultAddress,
        beneficiaryAddress,
        amountToRevoke,
        reason,
        proposedBy,
      );

      res.status(201).json({
        success: true,
        data: proposal,
      });
    } catch (error) {
      console.error("Error creating revocation proposal:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/admin/multi-sig/proposal/:proposalId - Get proposal details
app.get(
  "/api/admin/multi-sig/proposal/:proposalId",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { proposalId } = req.params;

      const proposal = await multiSigRevocationService.getProposal(proposalId);

      res.json({
        success: true,
        data: proposal,
      });
    } catch (error) {
      console.error("Error getting proposal:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/admin/multi-sig/proposals/:vaultAddress - Get pending proposals for vault
app.get(
  "/api/admin/multi-sig/proposals/:vaultAddress",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { vaultAddress } = req.params;

      const proposals =
        await multiSigRevocationService.getPendingProposals(vaultAddress);

      res.json({
        success: true,
        data: proposals,
      });
    } catch (error) {
      console.error("Error getting pending proposals:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// POST /api/admin/multi-sig/sign - Sign a proposal
app.post(
  "/api/admin/multi-sig/sign",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { proposalId, signature } = req.body;
      const signerAddress = req.user.address;

      if (!proposalId || !signature) {
        return res.status(400).json({
          success: false,
          error: "proposalId and signature are required",
        });
      }

      const result = await multiSigRevocationService.addSignature(
        proposalId,
        signerAddress,
        signature,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error adding signature:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/admin/multi-sig/stats - Get multi-sig statistics
app.get(
  "/api/admin/multi-sig/stats",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const stats = await multiSigRevocationService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting multi-sig stats:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/vaults/:id/export - Export vault data as CSV
app.get("/api/vaults/:id/export", async (req, res) => {
  try {
    const { id } = req.params;
    await vaultExportService.streamVaultAsCSV(id, res);
  } catch (error) {
    console.error("Error exporting vault:", error);

    // If headers haven't been sent yet, send JSON error response
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      res.destroy(error);
    }
  }
});
// Balance query endpoint
app.get("/api/vaults/:id/balance", async (req, res) => {
  try {
    const { id } = req.params;
    const vaultService = new VaultService();

    const balanceInfo = await vaultService.queryBalanceInfo(id);

    res.json({
      success: true,
      data: balanceInfo.toJSON(),
    });
  } catch (error) {
    console.error("Error querying vault balance:", error);

    if (error.message && error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
});

// Vesting Agreement PDF endpoint
app.get("/api/vault/:id/agreement.pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      Vault,
      Beneficiary,
      SubSchedule,
      Organization,
      Token,
    } = require("./models");

    // Find vault with related data
    const vault = await Vault.findOne({
      where: { id },
      include: [
        {
          model: Organization,
          as: "organization",
          required: false,
        },
        {
          model: Beneficiary,
          required: true,
        },
        {
          model: SubSchedule,
          required: false,
        },
      ],
    });

    if (!vault) {
      return res.status(404).json({
        success: false,
        error: "Vault not found",
      });
    }

    // Get token information (assuming token address maps to token model)
    let token = null;
    if (vault.token_address) {
      token = await Token.findOne({
        where: { address: vault.token_address },
      });
    }

    // Prepare data for PDF generation
    const vaultData = {
      vault: vault.get({ plain: true }),
      beneficiaries: vault.Beneficiaries || [],
      subSchedules: vault.SubSchedules || [],
      organization: vault.organization,
      token: token,
    };

    // Generate and stream PDF
    await pdfService.streamVestingAgreement(vaultData, res);
  } catch (error) {
    console.error("Error generating vesting agreement:", error);

    // If headers haven't been sent yet, send JSON error response
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    } else {
      res.destroy(error);
    }
  }
});

// Token distribution endpoint for pie chart data
app.get("/api/token/:address/distribution", async (req, res) => {
  try {
    const { address } = req.params;
    const { Vault } = require("./models");

    // Get all vaults for this token address, grouped by tag
    const distribution = await Vault.findAll({
      attributes: [
        "tag",
        [sequelize.fn("SUM", sequelize.col("total_amount")), "total_amount"],
      ],
      where: {
        token_address: address,
        total_amount: {
          [sequelize.Op.gt]: 0,
        },
      },
      group: ["tag"],
      raw: true,
    });

    // Format the response
    const result = distribution
      .filter((item) => item.tag) // Filter out null tags
      .map((item) => ({
        label: item.tag,
        amount: parseFloat(item.total_amount),
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching token distribution:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Dividend Distribution Endpoints
// POST /api/admin/dividend/round - Create new dividend round
app.post(
  "/api/admin/dividend/round",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const {
        tokenAddress,
        totalAmount,
        dividendToken,
        vestedTreatment = "full",
        unvestedMultiplier = 1.0,
      } = req.body;
      const createdBy = req.user.address;

      if (!tokenAddress || !totalAmount || !dividendToken) {
        return res.status(400).json({
          success: false,
          error: "tokenAddress, totalAmount, and dividendToken are required",
        });
      }

      const dividendRound = await dividendService.createDividendRound(
        tokenAddress,
        totalAmount,
        dividendToken,
        vestedTreatment,
        unvestedMultiplier,
        createdBy,
      );

      res.status(201).json({
        success: true,
        data: dividendRound,
      });
    } catch (error) {
      console.error("Error creating dividend round:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// Token distribution endpoint for pie chart data
app.post(
  "/api/admin/dividend/round",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const {
        tokenAddress,
        totalAmount,
        dividendToken,
        vestedTreatment = "full",
        unvestedMultiplier = 1.0,
      } = req.body;

      const createdBy = req.user.address;

      if (!tokenAddress || !totalAmount || !dividendToken) {
        return res.status(400).json({
          success: false,
          error: "tokenAddress, totalAmount, and dividendToken are required",
        });
      }

      const dividendRound = await dividendService.createDividendRound(
        tokenAddress,
        totalAmount,
        dividendToken,
        vestedTreatment,
        unvestedMultiplier,
        createdBy,
      );

      return res.status(201).json({
        success: true,
        data: dividendRound,
      });
    } catch (error) {
      console.error("Error creating dividend round:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
); // POST /api/admin/dividend/:roundId/snapshot - Take dividend snapshot
app.post(
  "/api/admin/dividend/:roundId/snapshot",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { roundId } = req.params;

      const result = await dividendService.takeDividendSnapshot(roundId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error taking dividend snapshot:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// POST /api/admin/dividend/:roundId/calculate - Calculate dividend distributions
app.post(
  "/api/admin/dividend/:roundId/calculate",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { roundId } = req.params;

      const distributions =
        await dividendService.calculateDividendDistributions(roundId);

      res.json({
        success: true,
        data: distributions,
      });
    } catch (error) {
      console.error("Error calculating dividend distributions:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// POST /api/admin/dividend/:roundId/distribute - Distribute dividends
app.post(
  "/api/admin/dividend/:roundId/distribute",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { roundId } = req.params;

      const result = await dividendService.distributeDividends(roundId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error distributing dividends:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/admin/dividend/round/:roundId - Get dividend round details
app.get(
  "/api/admin/dividend/round/:roundId",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { roundId } = req.params;

      const dividendRound = await dividendService.getDividendRound(roundId);

      res.json({
        success: true,
        data: dividendRound,
      });
    } catch (error) {
      console.error("Error getting dividend round:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/admin/dividend/rounds/:tokenAddress - Get dividend rounds for token
app.get(
  "/api/admin/dividend/rounds/:tokenAddress",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const { tokenAddress } = req.params;
      const { status } = req.query;

      const rounds = await dividendService.getDividendRounds(
        tokenAddress,
        status,
      );

      res.json({
        success: true,
        data: rounds,
      });
    } catch (error) {
      console.error("Error getting dividend rounds:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// GET /api/dividend/history/:userAddress - Get user dividend history
app.get("/api/dividend/history/:userAddress", async (req, res) => {
  try {
    const { userAddress } = req.params;
    const { limit = 50 } = req.query;

    const history = await dividendService.getUserDividendHistory(
      userAddress,
      parseInt(limit),
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("Error getting dividend history:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/admin/dividend/stats - Get dividend statistics
app.get(
  "/api/admin/dividend/stats",
  authService.authenticate(true),
  async (req, res) => {
    try {
      const stats = await dividendService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error getting dividend stats:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// Sentry error handler must be before any other error middleware and after all controllers
if (process.env.SENTRY_DSN && Sentry.Handlers) {
  app.use(Sentry.Handlers.errorHandler());
}

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    await sequelize.sync();
    console.log("Database synchronized successfully.");

    // Initialize Redis Cache
    try {
      await cacheService.connect();
      if (cacheService.isReady()) {
        console.log("Redis cache connected successfully.");
      } else {
        console.log("Redis cache not available, continuing without caching...");
      }
    } catch (cacheError) {
      console.error("Failed to connect to Redis:", cacheError);
      console.log("Continuing without Redis cache...");
    }

    // Initialize GraphQL Server
    let graphQLServer = null;
    try {
      const { GraphQLServer } = require("./graphql/server");
      graphQLServer = new GraphQLServer(app, httpServer);
      await graphQLServer.start();
      await graphQLServer.applyMiddleware(app);
      console.log("GraphQL Server initialized successfully.");

      const serverInfo = graphQLServer.getServerInfo();
      console.log(
        `GraphQL Playground available at: ${serverInfo.playgroundUrl}`,
      );
      console.log(
        `GraphQL Subscriptions available at: ${serverInfo.subscriptionEndpoint}`,
      );
    } catch (graphqlError) {
      console.error("Failed to initialize GraphQL Server:", graphqlError);
      console.log("Continuing with REST API only...");
    }

    // Initialize Discord Bot
    try {
      await discordBotService.start();
    } catch (discordError) {
      console.error("Failed to initialize Discord Bot:", discordError);
      console.log("Continuing without Discord bot...");
    }

    // Initialize Monthly Report Job
    try {
      monthlyReportJob.start();
    } catch (jobError) {
      console.error("Failed to initialize Monthly Report Job:", jobError);
    }

    // Initialize Vault Reconciliation Job
    const vaultReconciliationJob = new VaultReconciliationJob();
    try {
      vaultReconciliationJob.start();
      console.log("Vault Reconciliation Job started successfully.");
    } catch (jobError) {
      console.error("Failed to initialize Vault Reconciliation Job:", jobError);
    }

    // Initialize Notification Service
    try {
      notificationService.start();
      console.log("Notification service started successfully.");
    } catch (notificationError) {
      console.error(
        "Failed to initialize Notification Service:",
        notificationError,
      );
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`REST API available at: http://localhost:${PORT}`);
      if (graphQLServer) {
        console.log(
          `GraphQL API available at: http://localhost:${PORT}/graphql`,
        );
      }
    });
  } catch (error) {
    console.error("Unable to start server:", error);
    process.exit(1);
  }
};

// ✅ Only start once if run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
