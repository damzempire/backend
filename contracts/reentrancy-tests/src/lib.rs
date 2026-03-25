#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, testutils::Address as TestAddress};
use vesting_vault::{VestingVault, Vault, DataKey as VaultDataKey};
use malicious_contract::{MaliciousContract, AttackState, DataKey as MaliciousDataKey};

#[contract]
pub struct ReentrancyTests;

#[contractimpl]
impl ReentrancyTests {
    /// Run comprehensive reentrancy tests
    pub fn run_reentrancy_tests(env: Env) -> bool {
        // Test 1: Basic reentrancy protection on claim()
        let test1_result = Self::test_claim_reentrancy_protection(&env);
        
        // Test 2: Reentrancy protection on revoke() during claim()
        let test2_result = Self::test_revoke_reentrancy_protection(&env);
        
        // Test 3: Reentrancy protection on create_vault() during claim()
        let test3_result = Self::test_create_vault_reentrancy_protection(&env);
        
        // Test 4: Verify CEI pattern prevents state corruption
        let test4_result = Self::test_cei_pattern_protection(&env);
        
        test1_result && test2_result && test3_result && test4_result
    }

    /// Test that claim() is protected against reentrancy
    fn test_claim_reentrancy_protection(env: &Env) -> bool {
        let admin = Address::generate(env);
        let beneficiary = Address::generate(env);
        let attacker = Address::generate(env);

        // Deploy contracts
        let vault_contract_id = env.register_contract(None, VestingVault);
        let vault_contract = VestingVaultClient::new(env, &vault_contract_id);
        
        let malicious_contract_id = env.register_contract(None, MaliciousContract);
        let malicious_contract = MaliciousContractClient::new(env, &malicious_contract_id);

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
        !attack_successful
    }

    /// Test that revoke() is protected during claim()
    fn test_revoke_reentrancy_protection(env: &Env) -> bool {
        let admin = Address::generate(env);
        let beneficiary = Address::generate(env);

        // Deploy contracts
        let vault_contract_id = env.register_contract(None, VestingVault);
        let vault_contract = VestingVaultClient::new(env, &vault_contract_id);
        
        let malicious_contract_id = env.register_contract(None, MaliciousContract);
        let malicious_contract = MaliciousContractClient::new(env, &malicious_contract_id);

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
        !attack_successful
    }

    /// Test that create_vault() is protected during claim()
    fn test_create_vault_reentrancy_protection(env: &Env) -> bool {
        let admin = Address::generate(env);
        let beneficiary = Address::generate(env);
        let new_beneficiary = Address::generate(env);

        // Deploy contracts
        let vault_contract_id = env.register_contract(None, VestingVault);
        let vault_contract = VestingVaultClient::new(env, &vault_contract_id);
        
        let malicious_contract_id = env.register_contract(None, MaliciousContract);
        let malicious_contract = MaliciousContractClient::new(env, &malicious_contract_id);

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
        !attack_successful
    }

    /// Test that CEI pattern prevents state corruption
    fn test_cei_pattern_protection(env: &Env) -> bool {
        let admin = Address::generate(env);
        let beneficiary = Address::generate(env);

        // Deploy contracts
        let vault_contract_id = env.register_contract(None, VestingVault);
        let vault_contract = VestingVaultClient::new(env, &vault_contract_id);

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
        final_vault.released_amount == expected_released && 
        final_vault.total_amount == initial_vault.total_amount &&
        claimed_amount > 0
    }

    /// Test normal operation without reentrancy attempts
    pub fn test_normal_operation(env: Env) -> bool {
        let admin = Address::generate(&env);
        let beneficiary = Address::generate(&env);

        // Deploy contract
        let vault_contract_id = env.register_contract(None, VestingVault);
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

        // Test normal claim after vesting
        env.ledger().set_timestamp(2000u64);
        let claimed_amount = vault_contract.claim(&vault_id);
        
        claimed_amount > 0
    }
}

// Client wrappers for testing
#[derive(Clone)]
pub struct VestingVaultClient<'a> {
    contract_id: &'a Address,
    env: &'a Env,
}

impl<'a> VestingVaultClient<'a> {
    pub fn new(env: &'a Env, contract_id: &'a Address) -> Self {
        Self { contract_id, env }
    }

    pub fn initialize(&self, admin: &Address) {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "initialize"),
            (admin,),
        );
    }

    pub fn create_vault(
        &self,
        beneficiary: &Address,
        total_amount: &i128,
        cliff_date: &u64,
        vesting_start: &u64,
        vesting_duration: &u64,
        revocable: &bool,
    ) -> Address {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "create_vault"),
            (beneficiary, total_amount, cliff_date, vesting_start, vesting_duration, revocable),
        ).unwrap()
    }

    pub fn claim(&self, vault_id: &Address) -> i128 {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "claim"),
            (vault_id,),
        ).unwrap()
    }

    pub fn revoke(&self, vault_id: &Address) {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "revoke"),
            (vault_id,),
        );
    }

    pub fn get_vault_info(&self, vault_id: &Address) -> Vault {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "get_vault_info"),
            (vault_id,),
        ).unwrap()
    }
}

#[derive(Clone)]
pub struct MaliciousContractClient<'a> {
    contract_id: &'a Address,
    env: &'a Env,
}

impl<'a> MaliciousContractClient<'a> {
    pub fn new(env: &'a Env, contract_id: &'a Address) -> Self {
        Self { contract_id, env }
    }

    pub fn initialize(&self, vault_contract: &Address, vault_id: &Address) {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "initialize"),
            (vault_contract, vault_id),
        );
    }

    pub fn attempt_claim_reentrancy(&self) -> bool {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "attempt_claim_reentrancy"),
            (),
        ).unwrap()
    }

    pub fn attempt_revoke_reentrancy(&self) -> bool {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "attempt_revoke_reentrancy"),
            (),
        ).unwrap()
    }

    pub fn attempt_create_vault_reentrancy(&self, beneficiary: &Address) -> bool {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "attempt_create_vault_reentrancy"),
            (beneficiary,),
        ).unwrap()
    }

    pub fn get_attack_info(&self) -> AttackState {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "get_attack_info"),
            (),
        ).unwrap()
    }

    pub fn reset_attack_state(&self) {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "reset_attack_state"),
            (),
        );
    }
}

#[cfg(test)]
mod tests;

// Client wrapper for test contract
#[derive(Clone)]
pub struct ReentrancyTestsClient<'a> {
    contract_id: &'a Address,
    env: &'a Env,
}

impl<'a> ReentrancyTestsClient<'a> {
    pub fn new(env: &'a Env, contract_id: &'a Address) -> Self {
        Self { contract_id, env }
    }

    pub fn run_reentrancy_tests(&self) -> bool {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "run_reentrancy_tests"),
            (),
        ).unwrap()
    }

    pub fn test_normal_operation(&self) -> bool {
        self.env.invoke_contract(
            self.contract_id,
            &Symbol::new(self.env, "test_normal_operation"),
            (),
        ).unwrap()
    }
}
