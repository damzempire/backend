const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const {
  AuditorToken,
  Organization,
  Vault,
  SubSchedule,
  ClaimsHistory,
  VaultLegalDocument,
} = require("../models");

const VALID_SCOPES = [
  "vesting_schedules",
  "withdrawal_history",
  "contract_hashes",
];
const MAX_TOKEN_DURATION_DAYS = 90;

class AuditorService {
  /**
   * Issue a temporary auditor token scoped to a specific organization/project.
   * Only admins of the organization can issue tokens.
   */
  async issueToken({
    auditorName,
    auditorFirm,
    orgId,
    issuedBy,
    scopes,
    expiresInDays = 30,
  }) {
    if (!auditorName || !orgId || !issuedBy) {
      throw new Error("auditorName, orgId, and issuedBy are required");
    }

    if (expiresInDays < 1 || expiresInDays > MAX_TOKEN_DURATION_DAYS) {
      throw new Error(
        `Token duration must be between 1 and ${MAX_TOKEN_DURATION_DAYS} days`,
      );
    }

    // Validate the organization exists
    const org = await Organization.findByPk(orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    // Verify issuer is admin of the organization
    if (org.admin_address.toLowerCase() !== issuedBy.toLowerCase()) {
      throw new Error("Only organization admins can issue auditor tokens");
    }

    // Validate scopes
    const requestedScopes = scopes && scopes.length > 0 ? scopes : VALID_SCOPES;
    const invalidScopes = requestedScopes.filter(
      (s) => !VALID_SCOPES.includes(s),
    );
    if (invalidScopes.length > 0) {
      throw new Error(
        `Invalid scopes: ${invalidScopes.join(", ")}. Valid scopes: ${VALID_SCOPES.join(", ")}`,
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Generate a signed JWT as the auditor token
    const tokenPayload = {
      type: "auditor",
      org_id: orgId,
      scopes: requestedScopes,
      auditor_name: auditorName,
    };

    const rawToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: `${expiresInDays}d`,
      issuer: "vesting-vault",
      audience: "vesting-vault-auditor",
      jwtid: crypto.randomUUID(),
    });

    // Hash the token for storage (we don't store the raw token)
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await AuditorToken.create({
      token_hash: tokenHash,
      auditor_name: auditorName,
      auditor_firm: auditorFirm || null,
      org_id: orgId,
      issued_by: issuedBy,
      scopes: requestedScopes,
      expires_at: expiresAt,
    });

    return {
      token: rawToken,
      expires_at: expiresAt,
      scopes: requestedScopes,
      org_id: orgId,
      auditor_name: auditorName,
    };
  }

  /**
   * Verify an auditor token and return its metadata.
   * Also updates usage tracking.
   */
  async verifyToken(rawToken) {
    let decoded;
    try {
      decoded = jwt.verify(rawToken, process.env.JWT_SECRET, {
        issuer: "vesting-vault",
        audience: "vesting-vault-auditor",
      });
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new Error("Auditor token has expired");
      }
      throw new Error("Invalid auditor token");
    }

    if (decoded.type !== "auditor") {
      throw new Error("Invalid token type");
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const storedToken = await AuditorToken.findOne({
      where: {
        token_hash: tokenHash,
        is_revoked: false,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!storedToken) {
      throw new Error("Auditor token not found or has been revoked");
    }

    // Update usage tracking
    await storedToken.update({
      last_used_at: new Date(),
      usage_count: storedToken.usage_count + 1,
    });

    return {
      id: storedToken.id,
      org_id: storedToken.org_id,
      scopes: storedToken.scopes,
      auditor_name: storedToken.auditor_name,
      auditor_firm: storedToken.auditor_firm,
      expires_at: storedToken.expires_at,
    };
  }

  /**
   * Revoke an auditor token. Only the issuing org admin can revoke.
   */
  async revokeToken(tokenId, adminAddress) {
    const token = await AuditorToken.findByPk(tokenId, {
      include: [{ model: Organization, as: "organization" }],
    });

    if (!token) {
      throw new Error("Auditor token not found");
    }

    if (
      token.organization.admin_address.toLowerCase() !==
      adminAddress.toLowerCase()
    ) {
      throw new Error("Only the organization admin can revoke auditor tokens");
    }

    if (token.is_revoked) {
      throw new Error("Token is already revoked");
    }

    await token.update({ is_revoked: true });
    return { id: token.id, revoked: true };
  }

  /**
   * List all auditor tokens for an organization.
   */
  async listTokens(orgId, adminAddress) {
    const org = await Organization.findByPk(orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    if (org.admin_address.toLowerCase() !== adminAddress.toLowerCase()) {
      throw new Error("Only organization admins can list auditor tokens");
    }

    const tokens = await AuditorToken.findAll({
      where: { org_id: orgId },
      attributes: { exclude: ["token_hash"] },
      order: [["created_at", "DESC"]],
    });

    return tokens;
  }

  // ── Read-Only Data Access Methods (used by auditor routes) ──

  /**
   * Get all vesting schedules for vaults in the auditor's scoped organization.
   */
  async getVestingSchedules(orgId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const vaults = await Vault.findAndCountAll({
      where: { org_id: orgId },
      include: [
        {
          model: SubSchedule,
          as: "subSchedules",
          attributes: [
            "id",
            "top_up_amount",
            "cliff_duration",
            "cliff_date",
            "vesting_start_date",
            "vesting_duration",
            "start_timestamp",
            "end_timestamp",
            "amount_withdrawn",
            "amount_released",
            "is_active",
            "transaction_hash",
            "created_at",
          ],
        },
      ],
      attributes: [
        "id",
        "address",
        "name",
        "token_address",
        "owner_address",
        "total_amount",
        "token_type",
        "tag",
        "is_active",
        "created_at",
      ],
      order: [["created_at", "DESC"]],
      limit: safeLimit,
      offset,
      distinct: true,
    });

    return {
      vaults: vaults.rows,
      pagination: {
        total: vaults.count,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(vaults.count / safeLimit),
      },
    };
  }

  /**
   * Get withdrawal/claims history for all vaults in the auditor's scoped organization.
   */
  async getWithdrawalHistory(orgId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    // Get vault addresses for the org
    const vaults = await Vault.findAll({
      where: { org_id: orgId },
      attributes: ["address", "owner_address"],
    });

    const ownerAddresses = [...new Set(vaults.map((v) => v.owner_address))];

    if (ownerAddresses.length === 0) {
      return {
        claims: [],
        pagination: { total: 0, page, limit: safeLimit, totalPages: 0 },
      };
    }

    const claims = await ClaimsHistory.findAndCountAll({
      where: { user_address: { [Op.in]: ownerAddresses } },
      attributes: [
        "id",
        "user_address",
        "token_address",
        "amount_claimed",
        "claim_timestamp",
        "transaction_hash",
        "block_number",
        "price_at_claim_usd",
        "created_at",
      ],
      order: [["claim_timestamp", "DESC"]],
      limit: safeLimit,
      offset,
    });

    return {
      claims: claims.rows,
      pagination: {
        total: claims.count,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(claims.count / safeLimit),
      },
    };
  }

  /**
   * Get on-chain contract hashes (legal document hashes) for vaults in the auditor's scoped org.
   */
  async getContractHashes(orgId, { page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const vaults = await Vault.findAll({
      where: { org_id: orgId },
      attributes: ["id"],
    });

    const vaultIds = vaults.map((v) => v.id);

    if (vaultIds.length === 0) {
      return {
        documents: [],
        pagination: { total: 0, page, limit: safeLimit, totalPages: 0 },
      };
    }

    const documents = await VaultLegalDocument.findAndCountAll({
      where: { vault_id: { [Op.in]: vaultIds } },
      attributes: [
        "id",
        "vault_id",
        "document_type",
        "document_name",
        "sha256_hash",
        "file_size_bytes",
        "uploaded_by",
        "uploaded_at",
        "last_verified_at",
      ],
      order: [["uploaded_at", "DESC"]],
      limit: safeLimit,
      offset,
    });

    return {
      documents: documents.rows,
      pagination: {
        total: documents.count,
        page,
        limit: safeLimit,
        totalPages: Math.ceil(documents.count / safeLimit),
      },
    };
  }

  /**
   * Get a combined audit report summary for the organization.
   */
  async getAuditSummary(orgId) {
    const org = await Organization.findByPk(orgId);
    if (!org) {
      throw new Error("Organization not found");
    }

    const vaults = await Vault.findAll({ where: { org_id: orgId } });
    const vaultIds = vaults.map((v) => v.id);
    const ownerAddresses = [...new Set(vaults.map((v) => v.owner_address))];

    const totalClaims =
      ownerAddresses.length > 0
        ? await ClaimsHistory.count({
            where: { user_address: { [Op.in]: ownerAddresses } },
          })
        : 0;

    const totalDocuments =
      vaultIds.length > 0
        ? await VaultLegalDocument.count({
            where: { vault_id: { [Op.in]: vaultIds } },
          })
        : 0;

    const totalSubSchedules =
      vaultIds.length > 0
        ? await SubSchedule.count({
            where: { vault_id: { [Op.in]: vaultIds } },
          })
        : 0;

    return {
      organization: {
        id: org.id,
        name: org.name,
      },
      totals: {
        vaults: vaults.length,
        active_vaults: vaults.filter((v) => v.is_active).length,
        sub_schedules: totalSubSchedules,
        claims: totalClaims,
        legal_documents: totalDocuments,
      },
      generated_at: new Date().toISOString(),
    };
  }
}

module.exports = new AuditorService();
