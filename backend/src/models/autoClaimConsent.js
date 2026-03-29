const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * AutoClaimConsent
 * Tracks beneficiary consent for automatic claim processing
 * Used for enterprise payroll batch claims
 */
const AutoClaimConsent = sequelize.define('AutoClaimConsent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  beneficiary_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Beneficiary wallet address',
  },
  vault_address: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Vault contract address',
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether auto-claim is enabled for this beneficiary',
  },
  consent_given_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: 'When consent was given',
  },
  consent_metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata about the consent',
  },
  max_claim_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 100.00,
    comment: 'Maximum percentage of vested amount that can be auto-claimed (0-100)',
  },
  min_claim_amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: true,
    comment: 'Minimum amount threshold for auto-claim',
  },
  claim_frequency: {
    type: DataTypes.ENUM('immediate', 'daily', 'weekly', 'monthly'),
    allowNull: true,
    defaultValue: 'immediate',
    comment: 'How frequently to process auto-claims',
  },
  last_claimed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the last auto-claim was processed',
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'auto_claim_consents',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['beneficiary_address'],
    },
    {
      fields: ['vault_address'],
    },
    {
      fields: ['beneficiary_address', 'vault_address'],
      unique: true,
    },
    {
      fields: ['is_enabled'],
    },
  ],
});

/**
 * Check if beneficiary has active auto-claim consent
 * @param {string} beneficiaryAddress - Beneficiary address
 * @param {string} vaultAddress - Vault address
 * @returns {Promise<boolean>} True if auto-claim is enabled
 */
AutoClaimConsent.hasActiveConsent = async function(beneficiaryAddress, vaultAddress) {
  const consent = await this.findOne({
    where: {
      beneficiary_address: beneficiaryAddress,
      vault_address: vaultAddress,
      is_enabled: true
    }
  });
  
  return !!consent;
};

/**
 * Get all beneficiaries with active auto-claim for a vault
 * @param {string} vaultAddress - Vault address
 * @returns {Promise<Array>} List of consents
 */
AutoClaimConsent.getVaultConsents = async function(vaultAddress) {
  return await this.findAll({
    where: {
      vault_address: vaultAddress,
      is_enabled: true
    }
  });
};

module.exports = AutoClaimConsent;
