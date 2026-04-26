# Cross-Contract Reentrancy Test Suite

This repository contains a comprehensive test suite for detecting and preventing cross-contract reentrancy attacks in Soroban smart contracts, specifically for the Vesting Vault system.

## Overview

The test suite consists of three main components:

1. **Vesting Vault Contract** - The main contract implementing reentrancy protection
2. **Malicious Contract** - A mock contract that attempts various reentrancy attacks
3. **Reentrancy Tests** - Comprehensive test suite to validate protection mechanisms

## Architecture

### Vesting Vault Contract

The main contract implements the **Checks-Effects-Interactions (CEI)** pattern to prevent reentrancy:

- **Checks**: Validate inputs and permissions before any state changes
- **Effects**: Update contract state before making external calls
- **Interactions**: Perform external calls after state is safely updated

### Reentrancy Protection Mechanisms

1. **Reentrancy Guard**: Simple boolean flag to detect recursive calls
2. **CEI Pattern**: Ensures state changes happen before external interactions
3. **Input Validation**: Comprehensive checks on all function parameters

## Key Functions Tested

### `create_vault()`
Creates a new vesting vault with specified parameters.
- **Reentrancy Test**: Attempts to call `create_vault()` during a `claim()` callback
- **Protection**: Reentrancy guard blocks recursive calls

### `claim()`
Allows beneficiaries to claim vested tokens.
- **Reentrancy Test**: Malicious contract attempts to call `claim()` recursively
- **Protection**: Reentrancy guard prevents double-claiming

### `revoke()`
Allows admin to revoke a vault (if revocable).
- **Reentrancy Test**: Attempts to call `revoke()` during `claim()` execution
- **Protection**: CEI pattern ensures atomic operations

## Test Scenarios

### 1. Basic Claim Reentrancy
```rust
// Malicious contract attempts to call claim() while inside claim()
malicious_contract.attempt_claim_reentrancy()
```

### 2. Revoke During Claim
```rust
// Malicious contract attempts to revoke vault during claim execution
malicious_contract.attempt_revoke_reentrancy()
```

### 3. Create Vault During Claim
```rust
// Malicious contract attempts to create new vault during claim execution
malicious_contract.attempt_create_vault_reentrancy(beneficiary)
```

### 4. State Consistency Validation
```rust
// Verify CEI pattern maintains consistent state
test_cei_pattern_protection()
```

## Running Tests

### Prerequisites
- Rust toolchain with wasm32-unknown-unknown target
- Soroban CLI tools

### Build and Test

**Windows (PowerShell):**
```powershell
cd contracts
.\build.ps1
```

**Linux/macOS:**
```bash
cd contracts
chmod +x build.sh
./build.sh
```

### Individual Contract Tests

```bash
# Test vesting vault contract
cd contracts/vesting-vault
cargo test

# Test malicious contract
cd contracts/malicious-contract
cargo test

# Test reentrancy test suite
cd contracts/reentrancy-tests
cargo test
```

## Expected Results

All tests should pass, demonstrating:

1. ✅ **Reentrancy Protection**: All malicious attempts are blocked
2. ✅ **State Consistency**: Contract state remains consistent after operations
3. ✅ **Normal Operation**: Legitimate use cases continue to work
4. ✅ **CEI Pattern**: Effects happen before interactions

## Security Features

### Reentrancy Guard Implementation
```rust
fn check_reentrancy(env: &Env) {
    let guard = env.storage().instance().get(&DataKey::ReentrancyGuard)
        .unwrap_or_else(|| ReentrancyGuard { entered: false });
    
    if guard.entered {
        panic!("reentrancy detected");
    }
    
    // Set guard
    env.storage().instance().set(&DataKey::ReentrancyGuard, &ReentrancyGuard { entered: true });
}
```

### CEI Pattern Example
```rust
pub fn claim(env: Env, vault_id: Address) -> i128 {
    // CHECKS
    Self::check_reentrancy(&env);
    let vault = Self::get_vault(&env, &vault_id);
    vault.beneficiary.require_auth();
    
    // EFFECTS - Update state first
    let claimable_amount = Self::calculate_claimable_amount(&env, &vault);
    let mut updated_vault = vault.clone();
    updated_vault.released_amount += claimable_amount;
    env.storage().instance().set(&DataKey::Vault(vault_id), &updated_vault);

    // INTERACTIONS - External calls after state update
    claimable_amount
}
```

## Attack Vectors Tested

1. **Recursive Claim**: Attempting to claim multiple times in single transaction
2. **State Manipulation**: Trying to modify vault state during operations
3. **Privilege Escalation**: Attempting admin operations during user operations
4. **Race Conditions**: Exploiting timing between checks and effects

## Mitigation Strategies

1. **Reentrancy Guards**: Prevent recursive calls
2. **CEI Pattern**: Ensure atomic operations
3. **Input Validation**: Comprehensive parameter checking
4. **Access Control**: Proper authorization checks
5. **State Integrity**: Maintain consistent contract state

## Integration with Backend

The smart contracts are designed to integrate with the Node.js backend:

- **Backend API**: Provides REST endpoints for contract interaction
- **Audit Trail**: All contract operations are logged in the backend
- **Stellar Integration**: Contract states anchored to Stellar blockchain
- **Monitoring**: Real-time detection of suspicious activities

## Contributing

When adding new tests:

1. Follow the CEI pattern in contract functions
2. Add corresponding reentrancy tests
3. Verify state consistency after operations
4. Update documentation

## Security Considerations

This test suite addresses:
- ✅ Cross-contract reentrancy
- ✅ State corruption prevention
- ✅ Atomic operation guarantees
- ✅ Access control validation
- ✅ Input sanitization

## Future Enhancements

1. **Gas Optimization**: Reduce gas costs for reentrancy protection
2. **Advanced Attack Patterns**: Test more sophisticated attack vectors
3. **Formal Verification**: Mathematical proofs of correctness
4. **Integration Testing**: End-to-end testing with backend
5. **Performance Benchmarks**: Measure overhead of protection mechanisms

## License

This test suite is part of the Vesting Vault project and follows the project's licensing terms.
