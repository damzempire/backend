#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Vec, Symbol, String, panic_with_error};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Vault {
    pub beneficiary: Address,
    pub total_amount: i128,
    pub released_amount: i128,
    pub cliff_date: u64,
    pub vesting_start: u64,
    pub vesting_duration: u64,
    pub revocable: bool,
    pub revoked: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VaultCleanupReward {
    pub bounty_percentage: u32,  // e.g., 10 for 10%
    pub platform_fee_paid: i128,
    pub bounty_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReentrancyGuard {
    pub entered: bool,
}

#[contracttype]
pub enum DataKey {
    Vault(Address),
    VaultCleanupReward(Address),
    ReentrancyGuard,
    Admin,
}

#[contract]
pub struct VestingVault;

#[contractimpl]
impl VestingVault {
    /// Initialize the contract with admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        
        // Initialize reentrancy guard
        let guard = ReentrancyGuard { entered: false };
        env.storage().instance().set(&DataKey::ReentrancyGuard, &guard);
    }

    /// Create a new vesting vault
    /// Implements CEI: Checks -> Effects -> Interactions
    pub fn create_vault(
        env: Env,
        beneficiary: Address,
        total_amount: i128,
        cliff_date: u64,
        vesting_start: u64,
        vesting_duration: u64,
        revocable: bool,
    ) -> Address {
        // CHECKS
        Self::check_reentrancy(&env);
        
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("contract not initialized"));
        admin.require_auth();

        if total_amount <= 0 {
            panic!("total amount must be positive");
        }
        
        if vesting_duration == 0 {
            panic!("vesting duration must be positive");
        }

        // EFFECTS - Update state before external calls
        let vault_id = beneficiary.clone();
        let vault = Vault {
            beneficiary: beneficiary.clone(),
            total_amount,
            released_amount: 0,
            cliff_date,
            vesting_start,
            vesting_duration,
            revocable,
            revoked: false,
        };

        env.storage().instance().set(&DataKey::Vault(vault_id.clone()), &vault);
        
        // INTERACTIONS - No external calls in this function, safe pattern
        vault_id
    }

    /// Claim vested tokens from a vault
    /// Implements CEI: Checks -> Effects -> Interactions
    pub fn claim(env: Env, vault_id: Address) -> i128 {
        // CHECKS
        Self::check_reentrancy(&env);
        
        let vault = Self::get_vault(&env, &vault_id);
        vault.beneficiary.require_auth();

        let claimable_amount = Self::calculate_claimable_amount(&env, &vault);
        
        if claimable_amount <= 0 {
            panic!("no tokens available to claim");
        }

        // EFFECTS - Update state before external calls
        let mut updated_vault = vault.clone();
        updated_vault.released_amount += claimable_amount;
        env.storage().instance().set(&DataKey::Vault(vault_id), &updated_vault);

        // INTERACTIONS - External call would go here (e.g., token transfer)
        // For this example, we just return the amount
        claimable_amount
    }

    /// Revoke a vault (only if revocable)
    /// Implements CEI: Checks -> Effects -> Interactions
    pub fn revoke(env: Env, vault_id: Address) {
        // CHECKS
        Self::check_reentrancy(&env);
        
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("contract not initialized"));
        admin.require_auth();

        let vault = Self::get_vault(&env, &vault_id);
        
        if !vault.revocable {
            panic!("vault is not revocable");
        }
        
        if vault.revoked {
            panic!("vault already revoked");
        }

        // EFFECTS - Update state before external calls
        let mut updated_vault = vault;
        updated_vault.revoked = true;
        env.storage().instance().set(&DataKey::Vault(vault_id), &updated_vault);

        // INTERACTIONS - External calls would go here (e.g., refund tokens)
        // For this example, we just mark as revoked
    }

    /// Get vault information
    pub fn get_vault_info(env: Env, vault_id: Address) -> Vault {
        Self::get_vault(&env, &vault_id)
    }

    /// Finalize and delete a vault to clean up ledger entries
    /// Returns cleanup bounty reward for users who delete empty vaults
    /// 
    /// Requirements:
    /// 1. Vault must exist
    /// 2. All tokens must be claimed (vault is empty)
    /// 3. Vesting period must be complete
    /// 4. Only vault owner can trigger this
    /// 
    /// Benefits:
    /// - Reduces ledger bloat by removing empty vault entries
    /// - Returns a bounty reward (percentage of platform fee) to incentivize cleanup
    /// 
    /// Returns: VaultCleanupReward with bounty amount and details
    pub fn finalize_and_delete(env: Env, vault_id: Address) -> VaultCleanupReward {
        // CHECKS
        Self::check_reentrancy(&env);
        
        let vault = Self::get_vault(&env, &vault_id);
        vault.beneficiary.require_auth();

        let current_time = env.ledger().timestamp();

        // Check: vesting period must be complete
        let vesting_end = vault.vesting_start + vault.vesting_duration;
        if current_time < vesting_end {
            panic!("vesting period not yet complete");
        }

        // Check: vault must be empty (all tokens claimed)
        if vault.released_amount != vault.total_amount {
            panic!("vault is not empty - not all tokens have been claimed");
        }

        // EFFECTS - Calculate and store cleanup reward before deletion
        let cleanup_reward_opt = env.storage().instance()
            .get::<_, VaultCleanupReward>(&DataKey::VaultCleanupReward(vault_id.clone()));

        let cleanup_reward = match cleanup_reward_opt {
            Some(reward) => reward,
            None => {
                // Default: 10% of platform fee if not previously set
                // Backend will have set this value during vault creation
                VaultCleanupReward {
                    bounty_percentage: 10,
                    platform_fee_paid: 0,
                    bounty_amount: 0,
                }
            }
        };

        // EFFECTS - Delete vault and cleanup reward from storage
        // This removes empty vault entries from the ledger, reducing bloat
        env.storage().instance().remove(&DataKey::Vault(vault_id.clone()));
        env.storage().instance().remove(&DataKey::VaultCleanupReward(vault_id.clone()));

        // Clear reentrancy guard
        Self::clear_reentrancy_guard(&env);

        // INTERACTIONS - Return cleanup reward info
        // Backend will handle actual token transfer
        cleanup_reward
    }

    /// Set cleanup reward data for a vault (admin only)
    /// Called during vault creation to configure the bounty amount
    pub fn set_cleanup_reward(
        env: Env,
        vault_id: Address,
        platform_fee_paid: i128,
        bounty_percentage: u32,
    ) {
        // CHECKS
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .unwrap_or_else(|| panic!("contract not initialized"));
        admin.require_auth();

        if bounty_percentage > 100 {
            panic!("bounty percentage cannot exceed 100");
        }

        // Ensure vault exists
        let _vault = Self::get_vault(&env, &vault_id);

        // EFFECTS - Store cleanup reward configuration
        let bounty_amount = (platform_fee_paid * bounty_percentage as i128) / 100;

        let cleanup_reward = VaultCleanupReward {
            bounty_percentage,
            platform_fee_paid,
            bounty_amount,
        };

        env.storage().instance().set(&DataKey::VaultCleanupReward(vault_id), &cleanup_reward);
    }

    /// Get cleanup reward information for a vault
    pub fn get_cleanup_reward(env: Env, vault_id: Address) -> Option<VaultCleanupReward> {
        env.storage().instance()
            .get(&DataKey::VaultCleanupReward(vault_id))
    }

    /// Helper function to check reentrancy
    fn check_reentrancy(env: &Env) {
        let guard = env.storage().instance().get(&DataKey::ReentrancyGuard)
            .unwrap_or_else(|| ReentrancyGuard { entered: false });
        
        if guard.entered {
            panic!("reentrancy detected");
        }
        
        // Set guard
        env.storage().instance().set(&DataKey::ReentrancyGuard, &ReentrancyGuard { entered: true });
    }

    /// Clear reentrancy guard (call at the end of functions)
    fn clear_reentrancy_guard(env: &Env) {
        env.storage().instance().set(&DataKey::ReentrancyGuard, &ReentrancyGuard { entered: false });
    }

    /// Get vault from storage
    fn get_vault(env: &Env, vault_id: &Address) -> Vault {
        env.storage().instance()
            .get(&DataKey::Vault(vault_id.clone()))
            .unwrap_or_else(|| panic!("vault not found"))
    }

    /// Calculate claimable amount
    fn calculate_claimable_amount(env: &Env, vault: &Vault) -> i128 {
        if vault.revoked {
            return 0;
        }

        let current_time = env.ledger().timestamp();
        
        if current_time < vault.cliff_date {
            return 0;
        }

        if current_time < vault.vesting_start {
            return 0;
        }

        let time_since_start = current_time - vault.vesting_start;
        let vested_time = if time_since_start > vault.vesting_duration {
            vault.vesting_duration
        } else {
            time_since_start
        };

        let vested_amount = (vault.total_amount * vested_time as i128) / vault.vesting_duration as i128;
        vested_amount.saturating_sub(vault.released_amount)
    }
}
