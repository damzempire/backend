const crypto = require('crypto');
const { Vault, Organization, VaultLegalDocument } = require('../models');

class LegalDocumentHashingService {
  constructor() {
    this.documentType = 'TOKEN_PURCHASE_AGREEMENT';
  }

  assertPdfBuffer(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      throw new Error('PDF file is required');
    }

    const pdfSignature = buffer.subarray(0, 5).toString('utf8');
    if (pdfSignature !== '%PDF-') {
      throw new Error('Uploaded file must be a valid PDF document');
    }
  }

  computeSha256(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  sanitizeDocumentName(documentName) {
    const fallbackName = 'token-purchase-agreement.pdf';
    if (!documentName || typeof documentName !== 'string') {
      return fallbackName;
    }

    const trimmed = documentName.trim();
    if (!trimmed) {
      return fallbackName;
    }

    return trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
  }

  async getVaultForLegalDocument(vaultId) {
    const vault = await Vault.findOne({
      where: { id: vaultId },
      include: [
        {
          model: Organization,
          as: 'organization',
          required: false,
        },
      ],
    });

    if (!vault) {
      throw new Error('Vault not found');
    }

    return vault;
  }

  ensureUploaderAccess(vault, uploaderAddress, uploaderRole) {
    if (!uploaderAddress) {
      throw new Error('Authenticated uploader address is required');
    }

    const isVaultOwner = vault.owner_address === uploaderAddress;
    const isOrganizationAdmin = vault.organization?.admin_address === uploaderAddress;
    const isPlatformAdmin = uploaderRole === 'admin';

    if (!isVaultOwner && !isOrganizationAdmin && !isPlatformAdmin) {
      throw new Error('You do not have permission to manage legal documents for this vault');
    }
  }

  async hashAndStoreDocument({ vaultId, pdfBuffer, documentName, mimeType, uploaderAddress, uploaderRole }) {
    this.assertPdfBuffer(pdfBuffer);

    const vault = await this.getVaultForLegalDocument(vaultId);
    this.ensureUploaderAccess(vault, uploaderAddress, uploaderRole);

    const sha256Hash = this.computeSha256(pdfBuffer);
    const sanitizedName = this.sanitizeDocumentName(documentName);
    const normalizedMimeType = mimeType || 'application/pdf';

    const [record, created] = await VaultLegalDocument.findOrCreate({
      where: {
        vault_id: vault.id,
        document_type: this.documentType,
      },
      defaults: {
        vault_id: vault.id,
        document_type: this.documentType,
        document_name: sanitizedName,
        mime_type: normalizedMimeType,
        file_size_bytes: pdfBuffer.length,
        sha256_hash: sha256Hash,
        uploaded_by: uploaderAddress,
        uploaded_at: new Date(),
      },
    });

    if (!created) {
      await record.update({
        document_name: sanitizedName,
        mime_type: normalizedMimeType,
        file_size_bytes: pdfBuffer.length,
        sha256_hash: sha256Hash,
        uploaded_by: uploaderAddress,
        uploaded_at: new Date(),
      });
    }

    return record;
  }

  async getStoredDocument(vaultId, requesterAddress, requesterRole) {
    const vault = await this.getVaultForLegalDocument(vaultId);
    this.ensureUploaderAccess(vault, requesterAddress, requesterRole);

    const record = await VaultLegalDocument.findOne({
      where: {
        vault_id: vault.id,
        document_type: this.documentType,
      },
    });

    if (!record) {
      throw new Error('No legal document fingerprint found for this vault');
    }

    return record;
  }

  async verifyDocument({ vaultId, pdfBuffer, requesterAddress, requesterRole }) {
    this.assertPdfBuffer(pdfBuffer);

    const record = await this.getStoredDocument(vaultId, requesterAddress, requesterRole);
    const computedHash = this.computeSha256(pdfBuffer);
    const matches = computedHash === record.sha256_hash;

    await record.update({
      last_verified_at: new Date(),
    });

    return {
      matches,
      computedHash,
      storedHash: record.sha256_hash,
      documentType: record.document_type,
      documentName: record.document_name,
    };
  }
}

module.exports = new LegalDocumentHashingService();
