/**
 * Privacy masking utilities for vault token amounts
 * Provides zero-knowledge privacy metadata masking functionality
 */

/**
 * Privacy tiers for token amount masking
 */
const PRIVACY_TIERS = {
  TINY: { min: 0, max: 1000, label: 'Under 1k' },
  SMALL: { min: 1000, max: 10000, label: 'Between 1k and 10k' },
  MEDIUM: { min: 10000, max: 50000, label: 'Between 10k and 50k' },
  LARGE: { min: 50000, max: 100000, label: 'Between 50k and 100k' },
  XLARGE: { min: 100000, max: 500000, label: 'Between 100k and 500k' },
  HUGE: { min: 500000, max: 1000000, label: 'Between 500k and 1M' },
  MASSIVE: { min: 1000000, max: Infinity, label: 'Over 1M' }
};

/**
 * Mask a token amount based on privacy tier
 * @param {string|number} amount - The actual token amount
 * @returns {Object} Masked amount information
 */
function maskTokenAmount(amount) {
  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return {
      is_masked: false,
      amount: numericAmount,
      display_amount: '0',
      tier: null
    };
  }

  // Find the appropriate tier
  const tier = Object.values(PRIVACY_TIERS).find(t =>
    numericAmount >= t.min && numericAmount < t.max
  );

  return {
    is_masked: true,
    amount: numericAmount,
    display_amount: tier ? tier.label : 'Unknown amount',
    tier: tier ? tier.label : null,
    range: tier ? { min: tier.min, max: tier.max === Infinity ? null : tier.max } : null
  };
}

/**
 * Get privacy tier for a given amount
 * @param {string|number} amount - The token amount
 * @returns {string|null} Privacy tier label
 */
function getPrivacyTier(amount) {
  const numericAmount = parseFloat(amount);

  if (isNaN(numericAmount) || numericAmount <= 0) {
    return null;
  }

  const tier = Object.values(PRIVACY_TIERS).find(t =>
    numericAmount >= t.min && numericAmount < t.max
  );

  return tier ? tier.label : null;
}

/**
 * Check if a user has permission to view unmasked vault data
 * @param {Object} user - User object with address and role
 * @param {Object} vault - Vault object with owner_address and beneficiaries
 * @returns {boolean} True if user can view unmasked data
 */
function hasUnmaskedPermission(user, vault) {
  if (!user || !vault) {
    return false;
  }

  // Admin users can see everything
  if (user.role === 'admin') {
    return true;
  }

  // Vault owner can see everything
  if (user.address === vault.owner_address) {
    return true;
  }

  // Beneficiaries can see their own vault data
  if (vault.beneficiaries && Array.isArray(vault.beneficiaries)) {
    const isBeneficiary = vault.beneficiaries.some(
      beneficiary => beneficiary.address === user.address
    );
    if (isBeneficiary) {
      return true;
    }
  }

  return false;
}

/**
 * Apply privacy masking to vault data
 * @param {Object} vault - Vault data object (could be VaultRegistry or Vault)
 * @param {Object} user - User requesting the data
 * @returns {Object} Vault data with privacy masking applied
 */
function applyPrivacyMasking(vault, user) {
  if (!vault) {
    return vault;
  }

  // Handle VaultRegistry structure
  let vaultDetails = vault;
  let isRegistryFormat = false;

  if (vault.vaultDetails) {
    // This is a VaultRegistry entry
    vaultDetails = vault.vaultDetails;
    isRegistryFormat = true;
  }

  // If vault doesn't have privacy mode enabled, return as-is
  if (!vaultDetails.privacy_mode_enabled) {
    return vault;
  }

  // If user has permission to see unmasked data, return as-is
  if (hasUnmaskedPermission(user, vaultDetails)) {
    if (isRegistryFormat) {
      return {
        ...vault,
        vaultDetails: {
          ...vaultDetails,
          privacy_mode_enabled: true,
          data_masked: false
        }
      };
    } else {
      return {
        ...vaultDetails,
        privacy_mode_enabled: true,
        data_masked: false
      };
    }
  }

  // Apply masking to sensitive fields
  const maskedVaultDetails = { ...vaultDetails };

  // Mask total_amount
  if (vaultDetails.total_amount) {
    maskedVaultDetails.total_amount = maskTokenAmount(vaultDetails.total_amount);
  }

  // Mask beneficiary allocations if present
  if (maskedVaultDetails.beneficiaries && Array.isArray(maskedVaultDetails.beneficiaries)) {
    maskedVaultDetails.beneficiaries = maskedVaultDetails.beneficiaries.map(beneficiary => {
      const maskedBeneficiary = { ...beneficiary };
      if (beneficiary.total_allocated) {
        maskedBeneficiary.total_allocated = maskTokenAmount(beneficiary.total_allocated);
      }
      if (beneficiary.total_withdrawn) {
        maskedBeneficiary.total_withdrawn = maskTokenAmount(beneficiary.total_withdrawn);
      }
      return maskedBeneficiary;
    });
  }

  // Mask subschedule amounts if present
  if (maskedVaultDetails.subSchedules && Array.isArray(maskedVaultDetails.subSchedules)) {
    maskedVaultDetails.subSchedules = maskedVaultDetails.subSchedules.map(schedule => {
      const maskedSchedule = { ...schedule };
      if (schedule.top_up_amount) {
        maskedSchedule.top_up_amount = maskTokenAmount(schedule.top_up_amount);
      }
      if (schedule.amount_withdrawn) {
        maskedSchedule.amount_withdrawn = maskTokenAmount(schedule.amount_withdrawn);
      }
      return maskedSchedule;
    });
  }

  const finalMaskedVault = {
    ...maskedVaultDetails,
    privacy_mode_enabled: true,
    data_masked: true
  };

  // Return in the same format as input
  if (isRegistryFormat) {
    return {
      ...vault,
      vaultDetails: finalMaskedVault
    };
  } else {
    return finalMaskedVault;
  }
}

module.exports = {
  PRIVACY_TIERS,
  maskTokenAmount,
  getPrivacyTier,
  hasUnmaskedPermission,
  applyPrivacyMasking
};
