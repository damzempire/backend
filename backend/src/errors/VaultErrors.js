/**
 * Custom error classes for vault operations with dynamic balance tokens
 */

class VaultError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InsufficientBalanceError extends VaultError {
  constructor(requested, available) {
    super(`Insufficient balance: requested ${requested}, available ${available}`);
    this.requested = requested;
    this.available = available;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      requested: this.requested,
      available: this.available
    };
  }
}

class BalanceQueryFailedError extends VaultError {
  constructor(tokenAddress, vaultAddress, originalError) {
    super(`Failed to query balance for token ${tokenAddress} in vault ${vaultAddress}`);
    this.tokenAddress = tokenAddress;
    this.vaultAddress = vaultAddress;
    this.originalError = originalError;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      tokenAddress: this.tokenAddress,
      vaultAddress: this.vaultAddress,
      originalError: this.originalError?.message
    };
  }
}

class OverflowError extends VaultError {
  constructor(operation, value1, value2) {
    super(`Overflow in ${operation}: ${value1} and ${value2}`);
    this.operation = operation;
    this.value1 = value1;
    this.value2 = value2;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      operation: this.operation,
      value1: this.value1,
      value2: this.value2
    };
  }
}

class DivisionByZeroError extends VaultError {
  constructor(numerator) {
    super(`Division by zero: ${numerator} / 0`);
    this.numerator = numerator;
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      numerator: this.numerator
    };
  }
}

module.exports = {
  VaultError,
  InsufficientBalanceError,
  BalanceQueryFailedError,
  OverflowError,
  DivisionByZeroError
};
