const { query, transaction } = require('./database');
const crypto = require('crypto');

class LegalAgreement {
  // Calculate SHA-256 hash of content
  static calculateHash(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  // Create a new token purchase agreement
  static async createAgreement(investorId, version = '1.0') {
    const text = `
      INSERT INTO token_purchase_agreements (investor_id, agreement_version)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await query(text, [investorId, version]);
    return result.rows[0];
  }

  // Add or update legal hash for a specific language
  static async upsertLegalHash(agreementId, languageId, content, isPrimary = false) {
    const hash = this.calculateHash(content);
    
    return await transaction(async (client) => {
      // Check if hash already exists for this agreement and language
      const checkText = `
        SELECT id FROM legal_agreement_hashes 
        WHERE agreement_id = $1 AND language_id = $2
      `;
      const checkResult = await client.query(checkText, [agreementId, languageId]);
      
      if (checkResult.rows.length > 0) {
        // Update existing hash
        const updateText = `
          UPDATE legal_agreement_hashes 
          SET sha256_hash = $3, content_text = $4, is_primary = $5, updated_at = CURRENT_TIMESTAMP
          WHERE agreement_id = $1 AND language_id = $2
          RETURNING *
        `;
        const result = await client.query(updateText, [agreementId, languageId, hash, content, isPrimary]);
        
        // Log the update
        await this.logAuditTrail(client, agreementId, languageId, 'updated', null, hash, 'system');
        
        return result.rows[0];
      } else {
        // Insert new hash
        const insertText = `
          INSERT INTO legal_agreement_hashes (agreement_id, language_id, sha256_hash, content_text, is_primary)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        const result = await client.query(insertText, [agreementId, languageId, hash, content, isPrimary]);
        
        // Log the creation
        await this.logAuditTrail(client, agreementId, languageId, 'created', null, hash, 'system');
        
        return result.rows[0];
      }
    });
  }

  // Set primary language for an agreement
  static async setPrimaryLanguage(agreementId, languageId, signerWallet, digitalSignature) {
    return await transaction(async (client) => {
      const text = `
        UPDATE legal_agreement_hashes 
        SET is_primary = TRUE, signed_at = CURRENT_TIMESTAMP, 
            signer_wallet_address = $3, digital_signature = $4
        WHERE agreement_id = $1 AND language_id = $2
        RETURNING *
      `;
      const result = await client.query(text, [agreementId, languageId, signerWallet, digitalSignature]);
      
      if (result.rows.length > 0) {
        // Log the primary language change
        await this.logAuditTrail(client, agreementId, languageId, 'primary_set', 
          null, result.rows[0].sha256_hash, signerWallet);
      }
      
      return result.rows[0];
    });
  }

  // Get all language hashes for an agreement
  static async getAgreementHashes(agreementId) {
    const text = `
      SELECT lah.*, l.code as language_code, l.name as language_name
      FROM legal_agreement_hashes lah
      JOIN languages l ON lah.language_id = l.id
      WHERE lah.agreement_id = $1
      ORDER BY lah.is_primary DESC, l.name ASC
    `;
    const result = await query(text, [agreementId]);
    return result.rows;
  }

  // Get primary language hash for an agreement
  static async getPrimaryHash(agreementId) {
    const text = `
      SELECT lah.*, l.code as language_code, l.name as language_name
      FROM legal_agreement_hashes lah
      JOIN languages l ON lah.language_id = l.id
      WHERE lah.agreement_id = $1 AND lah.is_primary = TRUE
    `;
    const result = await query(text, [agreementId]);
    return result.rows[0];
  }

  // Verify hash integrity
  static async verifyHash(agreementId, languageId, content) {
    const text = `
      SELECT sha256_hash FROM legal_agreement_hashes 
      WHERE agreement_id = $1 AND language_id = $2
    `;
    const result = await query(text, [agreementId, languageId]);
    
    if (result.rows.length === 0) {
      return { valid: false, error: 'Hash not found' };
    }
    
    const storedHash = result.rows[0].sha256_hash;
    const calculatedHash = this.calculateHash(content);
    
    return {
      valid: storedHash === calculatedHash,
      storedHash,
      calculatedHash
    };
  }

  // Get audit trail for an agreement
  static async getAuditTrail(agreementId) {
    const text = `
      SELECT laal.*, l.code as language_code, l.name as language_name
      FROM legal_agreement_audit_log laal
      JOIN languages l ON laal.language_id = l.id
      WHERE laal.agreement_id = $1
      ORDER BY laal.timestamp DESC
    `;
    const result = await query(text, [agreementId]);
    return result.rows;
  }

  // Get available languages
  static async getAvailableLanguages() {
    const text = 'SELECT * FROM languages WHERE is_active = TRUE ORDER BY name';
    const result = await query(text);
    return result.rows;
  }

  // Helper function to log audit trail
  static async logAuditTrail(client, agreementId, languageId, action, oldHash, newHash, changedBy, metadata = {}) {
    const text = `
      INSERT INTO legal_agreement_audit_log 
      (agreement_id, language_id, action, old_hash, new_hash, changed_by, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await client.query(text, [agreementId, languageId, action, oldHash, newHash, changedBy, JSON.stringify(metadata)]);
  }

  // Get investor's agreements
  static async getInvestorAgreements(investorId) {
    const text = `
      SELECT tpa.*, 
             COUNT(lah.id) as language_count,
             COUNT(CASE WHEN lah.is_primary = TRUE THEN 1 END) as has_primary
      FROM token_purchase_agreements tpa
      LEFT JOIN legal_agreement_hashes lah ON tpa.id = lah.agreement_id
      WHERE tpa.investor_id = $1
      GROUP BY tpa.id
      ORDER BY tpa.created_at DESC
    `;
    const result = await query(text, [investorId]);
    return result.rows;
  }
}

module.exports = LegalAgreement;
