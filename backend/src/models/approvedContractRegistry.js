const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

/**
 * ApprovedContractRegistry
 * Stores hashes of all audited and approved Soroban WASM files
 * Used to verify that only official, secure contracts can be linked to the dashboard
 */
const ApprovedContractRegistry = sequelize.define('ApprovedContractRegistry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  contract_address: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'Stellar contract address of the approved vault',
  },
  wasm_hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'SHA256 hash of the audited WASM file',
  },
  project_name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Human-readable project name',
  },
  version: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Contract version (e.g., "1.0.0")',
  },
  audit_status: {
    type: DataTypes.ENUM('pending', 'auditing', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Current audit status of the contract',
  },
  security_audit_report_url: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL to the security audit report',
  },
  auditor_address: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Address of the auditor/organization that approved this contract',
  },
  audit_timestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the contract was audited and approved',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: 'Whether this contract is currently active and approved',
  },
  is_blacklisted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'If true, this contract is flagged as malicious/impersonation',
  },
  blacklist_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reason for blacklisting (if applicable)',
  },
  blacklisted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the contract was blacklisted',
  },
  blacklisted_by: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Address that blacklisted this contract',
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Additional metadata about the contract',
  },
  compatibility_version: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Compatibility version for upgrade validation',
  },
  immutable_terms_hash: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Hash of immutable terms preserved in the contract',
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
  tableName: 'approved_contract_registry',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['contract_address'],
      unique: true,
    },
    {
      fields: ['wasm_hash'],
      unique: true,
    },
    {
      fields: ['audit_status'],
    },
    {
      fields: ['is_active'],
    },
    {
      fields: ['is_blacklisted'],
    },
    {
      fields: ['project_name'],
    },
  ],
});

/**
 * Check if a contract is approved
 * @param {string} contractAddress - Contract address to verify
 * @returns {Promise<boolean>} True if contract is approved
 */
ApprovedContractRegistry.isApproved = async function(contractAddress) {
  const contract = await this.findOne({
    where: {
      contract_address: contractAddress,
      is_active: true,
      is_blacklisted: false,
      audit_status: 'approved'
    }
  });
  
  return !!contract;
};

/**
 * Verify a contract's WASM hash
 * @param {string} contractAddress - Contract address
 * @param {string} wasmHash - WASM hash to verify
 * @returns {Promise<Object>} Verification result
 */
ApprovedContractRegistry.verifyWasmHash = async function(contractAddress, wasmHash) {
  const contract = await this.findOne({
    where: {
      contract_address: contractAddress,
      is_active: true
    }
  });

  if (!contract) {
    return {
      valid: false,
      error: 'Contract not found in registry',
      isBlacklisted: false
    };
  }

  if (contract.is_blacklisted) {
    return {
      valid: false,
      error: contract.blacklist_reason || 'Contract has been blacklisted',
      isBlacklisted: true,
      blacklistedAt: contract.blacklisted_at,
      blacklistedBy: contract.blacklisted_by
    };
  }

  if (contract.audit_status !== 'approved') {
    return {
      valid: false,
      error: `Contract audit status is ${contract.audit_status}`,
      auditStatus: contract.audit_status
    };
  }

  if (contract.wasm_hash !== wasmHash) {
    return {
      valid: false,
      error: 'WASM hash does not match approved version',
      expectedHash: contract.wasm_hash,
      providedHash: wasmHash
    };
  }

  return {
    valid: true,
    contractAddress: contract.contract_address,
    projectName: contract.project_name,
    version: contract.version,
    auditTimestamp: contract.audit_timestamp,
    auditorAddress: contract.auditor_address
  };
};

/**
 * Add a contract to the blacklist
 * @param {string} contractAddress - Contract to blacklist
 * @param {string} reason - Reason for blacklisting
 * @param {string} blacklistedBy - Address blacklisting the contract
 */
ApprovedContractRegistry.blacklistContract = async function(contractAddress, reason, blacklistedBy) {
  const [updated] = await this.update(
    {
      is_blacklisted: true,
      blacklist_reason: reason,
      blacklisted_at: new Date(),
      blacklisted_by: blacklistedBy,
      is_active: false
    },
    {
      where: { contract_address: contractAddress }
    }
  );
  
  return updated > 0;
};

module.exports = ApprovedContractRegistry;
