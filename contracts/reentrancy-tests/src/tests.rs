#[cfg(test)]
mod tests {
    use soroban_sdk::{Env, Address};
    use crate::{ReentrancyTestsClient, VestingVaultClient, MaliciousContractClient};

    #[test]
    fn test_comprehensive_reentrancy_protection() {
        let env = Env::default();
        let test_contract_id = env.register_contract(None, crate::ReentrancyTests);
        let test_client = ReentrancyTestsClient::new(&env, &test_contract_id);

        // Run all reentrancy tests
        let all_tests_passed = test_client.run_reentrancy_tests();
        
        assert!(all_tests_passed, "All reentrancy protection tests should pass");
    }

    #[test]
    fn test_normal_operation() {
        let env = Env::default();
        let test_contract_id = env.register_contract(None, crate::ReentrancyTests);
        let test_client = ReentrancyTestsClient::new(&env, &test_contract_id);

        // Test normal operation without reentrancy
        let normal_op_works = test_client.test_normal_operation();
        
        assert!(normal_op_works, "Normal operation should work correctly");
    }

    #[test]
    fn test_claim_reentrancy_protection() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let beneficiary = Address::generate(&env);

        // Deploy contracts
        let vault_contract_id = env.register_contract(None, crate::VestingVault);
        let vault_contract = VestingVaultClient::new(&env, &vault_contract_id);
        
        let malicious_contract_id = env.register_contract(None, crate::MaliciousContract);
        let malicious_contract = MaliciousContractClient::new(&env, &malicious_contract_id);

        // Initialize contracts
        vault_contract.initialize(&admin);
        
        // Create a vault
        let vault_id = vault_contract.create_vault(
            &beneficiary,
            &1000i128,
            &1000u64,
            &1000u64,
            &1000u64,
            &true
        );

        // Initialize malicious contract
        malicious_contract.initialize(&vault_contract_id, &vault_id);

        // Set up time for vesting
        env.ledger().set_timestamp(2000u64);

        // Attempt reentrancy attack
        let attack_successful = malicious_contract.attempt_claim_reentrancy();
        
        // Should fail - reentrancy should be blocked
        assert!(!attack_successful, "Reentrancy attack should be blocked");

        // Verify attack state
        let attack_info = malicious_contract.get_attack_info();
        assert!(attack_info.attack_count > 0, "Attack should have been attempted");
        assert!(!attack_info.reentrancy_successful, "Reentrancy should not be successful");
    }

    #[test]
    fn test_revoke_reentrancy_protection() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let beneficiary = Address::generate(&env);

        // Deploy contracts
        let vault_contract_id = env.register_contract(None, crate::VestingVault);
        let vault_contract = VestingVaultClient::new(&env, &vault_contract_id);
        
        let malicious_contract_id = env.register_contract(None, crate::MaliciousContract);
        let malicious_contract = MaliciousContractClient::new(&env, &malicious_contract_id);

        // Initialize contracts
        vault_contract.initialize(&admin);
        
        // Create a revocable vault
        let vault_id = vault_contract.create_vault(
            &beneficiary,
            &1000i128,
            &1000u64,
            &1000u64,
            &1000u64,
            &true
        );

        // Initialize malicious contract
        malicious_contract.initialize(&vault_contract_id, &vault_id);

        // Set up time for vesting
        env.ledger().set_timestamp(2000u64);

        // Attempt reentrancy attack
        let attack_successful = malicious_contract.attempt_revoke_reentrancy();
        
        // Should fail - reentrancy should be blocked
        assert!(!attack_successful, "Reentrancy attack should be blocked");

        // Verify attack state
        let attack_info = malicious_contract.get_attack_info();
        assert!(attack_info.attack_count > 0, "Attack should have been attempted");
        assert!(!attack_info.reentrancy_successful, "Reentrancy should not be successful");
    }

    #[test]
    fn test_create_vault_reentrancy_protection() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let beneficiary = Address::generate(&env);
        let new_beneficiary = Address::generate(&env);

        // Deploy contracts
        let vault_contract_id = env.register_contract(None, crate::VestingVault);
        let vault_contract = VestingVaultClient::new(&env, &vault_contract_id);
        
        let malicious_contract_id = env.register_contract(None, crate::MaliciousContract);
        let malicious_contract = MaliciousContractClient::new(&env, &malicious_contract_id);

        // Initialize contracts
        vault_contract.initialize(&admin);
        
        // Create a vault
        let vault_id = vault_contract.create_vault(
            &beneficiary,
            &1000i128,
            &1000u64,
            &1000u64,
            &1000u64,
            &true
        );

        // Initialize malicious contract
        malicious_contract.initialize(&vault_contract_id, &vault_id);

        // Set up time for vesting
        env.ledger().set_timestamp(2000u64);

        // Attempt reentrancy attack
        let attack_successful = malicious_contract.attempt_create_vault_reentrancy(&new_beneficiary);
        
        // Should fail - reentrancy should be blocked
        assert!(!attack_successful, "Reentrancy attack should be blocked");

        // Verify attack state
        let attack_info = malicious_contract.get_attack_info();
        assert!(attack_info.attack_count > 0, "Attack should have been attempted");
        assert!(!attack_info.reentrancy_successful, "Reentrancy should not be successful");
    }

    #[test]
    fn test_cei_pattern_state_consistency() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let beneficiary = Address::generate(&env);

        // Deploy contract
        let vault_contract_id = env.register_contract(None, crate::VestingVault);
        let vault_contract = VestingVaultClient::new(&env, &vault_contract_id);

        // Initialize contract
        vault_contract.initialize(&admin);
        
        // Create a vault
        let vault_id = vault_contract.create_vault(
            &beneficiary,
            &1000i128,
            &1000u64,
            &1000u64,
            &1000u64,
            &true
        );

        // Get initial state
        let initial_vault = vault_contract.get_vault_info(&vault_id);
        
        // Set up time for vesting
        env.ledger().set_timestamp(2000u64);

        // Claim tokens
        let claimed_amount = vault_contract.claim(&vault_id);
        
        // Get final state
        let final_vault = vault_contract.get_vault_info(&vault_id);

        // Verify state consistency
        let expected_released = initial_vault.released_amount + claimed_amount;
        assert_eq!(
            final_vault.released_amount, 
            expected_released, 
            "Released amount should be consistent"
        );
        assert_eq!(
            final_vault.total_amount, 
            initial_vault.total_amount, 
            "Total amount should not change"
        );
        assert!(claimed_amount > 0, "Should have claimed some tokens");
    }

    #[test]
    fn test_multiple_claims_state_consistency() {
        let env = Env::default();
        let admin = Address::generate(&env);
        let beneficiary = Address::generate(&env);

        // Deploy contract
        let vault_contract_id = env.register_contract(None, crate::VestingVault);
        let vault_contract = VestingVaultClient::new(&env, &vault_contract_id);

        // Initialize contract
        vault_contract.initialize(&admin);
        
        // Create a vault with longer duration
        let vault_id = vault_contract.create_vault(
            &beneficiary,
            &1000i128,
            &1000u64,
            &1000u64,
            &2000u64,
            &true
        );

        // First claim at half vesting
        env.ledger().set_timestamp(1500u64);
        let first_claim = vault_contract.claim(&vault_id);
        
        // Second claim at full vesting
        env.ledger().set_timestamp(3000u64);
        let second_claim = vault_contract.claim(&vault_id);

        // Get final state
        let final_vault = vault_contract.get_vault_info(&vault_id);

        // Verify total claimed equals expected amount
        let total_claimed = first_claim + second_claim;
        assert_eq!(
            final_vault.released_amount, 
            total_claimed, 
            "Total released should equal sum of claims"
        );
        assert_eq!(
            final_vault.released_amount, 
            final_vault.total_amount, 
            "Should have claimed all tokens"
        );
    }
}
