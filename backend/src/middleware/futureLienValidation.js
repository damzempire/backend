'use strict';

const { body, param, query, validationResult } = require('express-validator');
const { GrantStream, FutureLien, Vault, Beneficiary } = require('../models');

/**
 * Custom validation middleware for future lien operations
 */

// Validate that a vault exists and is not blacklisted
const validateVault = async (vaultAddress) => {
  const vault = await Vault.findOne({ where: { address: vaultAddress } });
  
  if (!vault) {
    throw new Error(`Vault not found: ${vaultAddress}`);
  }
  
  if (vault.is_blacklisted) {
    throw new Error(`Vault ${vaultAddress} is blacklisted due to integrity failure`);
  }
  
  return vault;
};

// Validate that a beneficiary exists in a vault
const validateBeneficiaryInVault = async (vaultAddress, beneficiaryAddress) => {
  const beneficiary = await Beneficiary.findOne({
    where: { 
      vault_address: vaultAddress, 
      address: beneficiaryAddress 
    }
  });
  
  if (!beneficiary) {
    throw new Error(`Beneficiary ${beneficiaryAddress} not found in vault ${vaultAddress}`);
  }
  
  return beneficiary;
};

// Validate that a grant stream exists and is active
const validateGrantStream = async (grantStreamId) => {
  const grantStream = await GrantStream.findByPk(grantStreamId);
  
  if (!grantStream) {
    throw new Error(`Grant stream not found: ${grantStreamId}`);
  }
  
  if (!grantStream.is_active) {
    throw new Error(`Grant stream ${grantStreamId} is not active`);
  }
  
  return grantStream;
};

// Validate that a future lien exists
const validateFutureLien = async (lienId) => {
  const lien = await FutureLien.findByPk(lienId);
  
  if (!lien) {
    throw new Error(`Future lien not found: ${lienId}`);
  }
  
  return lien;
};

// Validate release dates
const validateReleaseDates = (releaseStartDate, releaseEndDate) => {
  const start = new Date(releaseStartDate);
  const end = new Date(releaseEndDate);
  const now = new Date();
  
  if (end <= start) {
    throw new Error('Release end date must be after release start date');
  }
  
  if (start < now) {
    throw new Error('Release start date cannot be in the past');
  }
  
  // Release period shouldn't be more than 10 years
  const maxDuration = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years in milliseconds
  if (end - start > maxDuration) {
    throw new Error('Release period cannot exceed 10 years');
  }
};

// Validate milestone data
const validateMilestones = (milestones, committedAmount) => {
  if (!Array.isArray(milestones)) {
    throw new Error('Milestones must be an array');
  }
  
  if (milestones.length === 0) {
    throw new Error('At least one milestone is required for milestone-based releases');
  }
  
  let totalPercentage = 0;
  
  for (const milestone of milestones) {
    if (!milestone.name || typeof milestone.name !== 'string') {
      throw new Error('Each milestone must have a valid name');
    }
    
    const percentage = parseFloat(milestone.percentage_of_total);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      throw new Error('Milestone percentage must be between 0 and 100');
    }
    
    totalPercentage += percentage;
    
    if (milestone.target_date) {
      const targetDate = new Date(milestone.target_date);
      if (isNaN(targetDate.getTime())) {
        throw new Error('Invalid milestone target date format');
      }
    }
  }
  
  if (Math.abs(totalPercentage - 100) > 0.01) {
    throw new Error(`Milestone percentages must sum to 100%, got ${totalPercentage}%`);
  }
};

// Validate committed amount against beneficiary allocation
const validateCommittedAmount = async (vaultAddress, beneficiaryAddress, committedAmount) => {
  const beneficiary = await validateBeneficiaryInVault(vaultAddress, beneficiaryAddress);
  const allocation = parseFloat(beneficiary.total_allocated) || 0;
  
  if (committedAmount > allocation) {
    throw new Error(`Committed amount ${committedAmount} exceeds beneficiary allocation ${allocation}`);
  }
  
  // Check for existing liens that would exceed allocation
  const existingLiens = await FutureLien.findAll({
    where: {
      vault_address: vaultAddress,
      beneficiary_address: beneficiaryAddress,
      status: ['pending', 'active']
    }
  });
  
  const totalCommitted = existingLiens.reduce((sum, lien) => sum + parseFloat(lien.committed_amount), 0);
  
  if (totalCommitted + committedAmount > allocation) {
    throw new Error(`Total committed amount (${totalCommitted + committedAmount}) would exceed beneficiary allocation (${allocation})`);
  }
};

// Validation chains for express-validator

const createFutureLienValidation = [
  body('vault_address')
    .isEthereumAddress()
    .withMessage('Valid vault address required'),
  
  body('beneficiary_address')
    .isEthereumAddress()
    .withMessage('Valid beneficiary address required'),
  
  body('grant_stream_id')
    .isInt({ min: 1 })
    .withMessage('Valid grant stream ID required'),
  
  body('committed_amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Committed amount must be positive'),
  
  body('release_start_date')
    .isISO8601()
    .withMessage('Valid release start date required'),
  
  body('release_end_date')
    .isISO8601()
    .withMessage('Valid release end date required'),
  
  body('release_rate_type')
    .isIn(['linear', 'milestone', 'immediate'])
    .withMessage('Release rate type must be linear, milestone, or immediate'),
  
  body('transaction_hash')
    .optional()
    .isLength({ min: 66, max: 66 })
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),
  
  body('contract_interaction_hash')
    .optional()
    .isLength({ min: 66, max: 66 })
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid contract interaction hash format'),
  
  body('milestones')
    .optional()
    .isArray()
    .withMessage('Milestones must be an array'),
  
  // Custom validations
  body('vault_address').custom(async (value) => {
    await validateVault(value);
    return true;
  }),
  
  body('beneficiary_address').custom(async (value, { req }) => {
    await validateBeneficiaryInVault(req.body.vault_address, value);
    return true;
  }),
  
  body('grant_stream_id').custom(async (value) => {
    await validateGrantStream(value);
    return true;
  }),
  
  body('committed_amount').custom(async (value, { req }) => {
    await validateCommittedAmount(req.body.vault_address, req.body.beneficiary_address, parseFloat(value));
    return true;
  }),
  
  body().custom((value, { req }) => {
    validateReleaseDates(req.body.release_start_date, req.body.release_end_date);
    return true;
  }),
  
  body().custom((value, { req }) => {
    if (req.body.release_rate_type === 'milestone') {
      validateMilestones(req.body.milestones || [], parseFloat(req.body.committed_amount));
    }
    return true;
  })
];

const processLienReleaseValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid lien ID required'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.00000001 })
    .withMessage('Amount must be positive'),
  
  body('milestone_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid milestone ID required'),
  
  body('transaction_hash')
    .optional()
    .isLength({ min: 66, max: 66 })
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage('Invalid transaction hash format'),
  
  body('block_number')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Invalid block number'),
  
  // Custom validations
  param('id').custom(async (value) => {
    await validateFutureLien(value);
    return true;
  })
];

const cancelFutureLienValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid lien ID required'),
  
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Reason must be string with max 500 characters'),
  
  // Custom validations
  param('id').custom(async (value) => {
    const lien = await validateFutureLien(value);
    
    if (lien.status === 'cancelled') {
      throw new Error('Lien is already cancelled');
    }
    
    if (lien.status === 'completed') {
      throw new Error('Cannot cancel completed lien');
    }
    
    return true;
  })
];

const getLienValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid lien ID required'),
  
  param('id').custom(async (value) => {
    await validateFutureLien(value);
    return true;
  })
];

const createGrantStreamValidation = [
  body('address')
    .isEthereumAddress()
    .withMessage('Valid contract address required'),
  
  body('name')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be string with length 1-255'),
  
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Description must be string with max 2000 characters'),
  
  body('owner_address')
    .isEthereumAddress()
    .withMessage('Valid owner address required'),
  
  body('token_address')
    .isEthereumAddress()
    .withMessage('Valid token address required'),
  
  body('target_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Target amount must be non-negative'),
  
  body('end_date')
    .optional()
    .isISO8601()
    .withMessage('Valid end date required'),
  
  body('end_date').custom((value) => {
    if (value && new Date(value) <= new Date()) {
      throw new Error('End date must be in the future');
    }
    return true;
  })
];

const calculatorValidation = [
  query('vault_address')
    .isEthereumAddress()
    .withMessage('Valid vault address required'),
  
  query('beneficiary_address')
    .isEthereumAddress()
    .withMessage('Valid beneficiary address required'),
  
  query('committed_amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Valid committed amount required'),
  
  query('release_rate_type')
    .isIn(['linear', 'milestone', 'immediate'])
    .withMessage('Invalid release rate type'),
  
  query('release_start_date')
    .isISO8601()
    .withMessage('Valid release start date required'),
  
  query('release_end_date')
    .isISO8601()
    .withMessage('Valid release end date required'),
  
  // Custom validations
  query('vault_address').custom(async (value) => {
    await validateVault(value);
    return true;
  }),
  
  query('beneficiary_address').custom(async (value, { req }) => {
    await validateBeneficiaryInVault(req.query.vault_address, value);
    return true;
  }),
  
  query().custom((value, { req }) => {
    validateReleaseDates(req.query.release_start_date, req.query.release_end_date);
    return true;
  })
];

// Error handling middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages,
      message: 'Request validation failed. Please check your input parameters.'
    });
  }
  
  next();
};

// Async error wrapper for catching validation errors in custom validators
const asyncValidationWrapper = (validator) => {
  return (req, res, next) => {
    Promise.resolve(validator(req, res, next)).catch(next);
  };
};

module.exports = {
  // Validation chains
  createFutureLienValidation,
  processLienReleaseValidation,
  cancelFutureLienValidation,
  getLienValidation,
  createGrantStreamValidation,
  calculatorValidation,
  
  // Middleware
  handleValidationErrors,
  asyncValidationWrapper,
  
  // Individual validators (for reuse in services)
  validateVault,
  validateBeneficiaryInVault,
  validateGrantStream,
  validateFutureLien,
  validateReleaseDates,
  validateMilestones,
  validateCommittedAmount
};
