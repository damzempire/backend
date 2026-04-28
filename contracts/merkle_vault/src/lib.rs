//! Merkle Tree-Based Vesting Airdrops (Issue #51)
//!
//! Single vault: admin commits one Merkle root; users claim streaming tokens
//! by providing a Merkle proof. No per-user vaults on-chain.

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Vec,
    token::TokenInterface,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    MerkleRoot,
    TotalAmount,
    StartTime,
    Duration,
    Cliff,
    ClaimedAmount(u32),
    // NFT related storage
    NFTOwner(u32),
    NFTMetadata(u32),
    Name,
    Symbol,
    TotalSupply,
}

#[contracttype]
#[derive(Clone)]
pub enum NFTEvent {
    Mint(Address, u32),
    Transfer(Address, Address, u32),
}

#[contract]
pub struct MerkleVault;

pub trait NFTInterface {
    fn mint(env: Env, to: Address, token_id: u32);
    fn owner_of(env: Env, token_id: u32) -> Address;
    fn transfer(env: Env, from: Address, to: Address, token_id: u32);
    fn approve(env: Env, approved: Address, token_id: u32);
    fn get_approved(env: Env, token_id: u32) -> Option<Address>;
    fn balance_of(env: Env, owner: Address) -> u32;
    fn token_uri(env: Env, token_id: u32) -> Bytes;
    fn name(env: Env) -> Bytes;
    fn symbol(env: Env) -> Bytes;
    fn total_supply(env: Env) -> u32;
}

#[contractimpl]
impl MerkleVault {
    /// One-time init: set admin and token. Call before initialize_merkle_vault.
    pub fn init(env: Env, admin: Address, token: Address, name: Bytes, symbol: Bytes) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already_initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        
        // Initialize NFT metadata
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::TotalSupply, &0u32);
    }

    /// Initialize the Merkle vesting vault with a single root.
    /// Admin must have transferred total_amount to this contract beforehand.
    pub fn initialize_merkle_vault(
        env: Env,
        root_hash: BytesN<32>,
        total_amount: i128,
        duration: u64,
        cliff: u64,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin_not_set");
        admin.require_auth();

        let inst = env.storage().instance();
        if inst.has(&DataKey::MerkleRoot) {
            panic!("merkle_vault_already_initialized");
        }
        if total_amount <= 0 {
            panic!("total_amount_must_be_positive");
        }
        if duration == 0 {
            panic!("duration_must_be_nonzero");
        }
        if cliff > duration {
            panic!("cliff_cannot_exceed_duration");
        }

        let now = env.ledger().timestamp();
        inst.set(&DataKey::MerkleRoot, &root_hash);
        inst.set(&DataKey::TotalAmount, &total_amount);
        inst.set(&DataKey::Duration, &duration);
        inst.set(&DataKey::Cliff, &cliff);
        inst.set(&DataKey::StartTime, &now);
    }

    /// Claim vested tokens by providing a Merkle proof. Proof is verified
    /// against the stored root before any vesting calculation. Only the current
    /// NFT owner can claim.
    pub fn claim_merkle(env: Env, proof: Vec<BytesN<32>>, index: u32, amount: i128) {
        let claimant = env.invoker();
        if amount <= 0 {
            panic!("amount_must_be_positive");
        }

        // Check if claimant owns the NFT for this vesting position
        let nft_owner: Address = Self::owner_of(env.clone(), index);
        if nft_owner != claimant {
            panic!("not_nft_owner");
        }

        let inst = env.storage().instance();
        let root: BytesN<32> = inst
            .get(&DataKey::MerkleRoot)
            .expect("merkle_vault_not_initialized");
        let start_time: u64 = inst.get(&DataKey::StartTime).expect("start_time_missing");
        let duration: u64 = inst.get(&DataKey::Duration).expect("duration_missing");
        let cliff: u64 = inst.get(&DataKey::Cliff).expect("cliff_missing");
        let token: Address = inst.get(&DataKey::Token).expect("token_not_set");

        let leaf = build_leaf(&env, index, &claimant, amount);

        if !verify_merkle_proof(&env, &root, &leaf, &proof, index) {
            panic!("invalid_merkle_proof");
        }

        let now = env.ledger().timestamp();
        let vested = compute_vested(amount, now, start_time, duration, cliff);

        let key = DataKey::ClaimedAmount(index);
        let already_claimed: i128 = inst.get(&key).unwrap_or(0);

        if vested <= already_claimed {
            panic!("nothing_to_claim");
        }

        let claimable = vested - already_claimed;
        inst.set(&key, &vested);

        let token_client = soroban_sdk::token::Client::new(&env, &token);
        token_client.transfer(
            &env.current_contract_address(),
            &claimant,
            &claimable,
        );
    }

    /// Read-only: get merkle root (for frontends/indexers).
    pub fn get_merkle_root(env: Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get(&DataKey::MerkleRoot)
            .expect("merkle_vault_not_initialized")
    }

    /// Read-only: get amount already claimed for an index.
    pub fn get_claimed(env: Env, index: u32) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::ClaimedAmount(index))
            .unwrap_or(0)
    }

    /// Mint NFT for a valid vesting position (called after successful Merkle proof verification)
    pub fn mint_vesting_nft(env: Env, to: Address, index: u32, amount: i128, proof: Vec<BytesN<32>>) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin_not_set");
        
        // Verify this is a valid vesting position by checking Merkle proof
        let root: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::MerkleRoot)
            .expect("merkle_vault_not_initialized");
        
        let leaf = build_leaf(&env, index, &to, amount);
        
        if !verify_merkle_proof(&env, &root, &leaf, &proof, index) {
            panic!("invalid_merkle_proof");
        }

        // Check if NFT already exists
        if env.storage().instance().has(&DataKey::NFTOwner(index)) {
            panic!("nft_already_exists");
        }

        Self::mint(env, to, index);
    }
}

#[contractimpl]
impl NFTInterface for MerkleVault {
    fn mint(env: Env, to: Address, token_id: u32) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin_not_set");
        
        admin.require_auth();
        
        if env.storage().instance().has(&DataKey::NFTOwner(token_id)) {
            panic!("token_already_minted");
        }

        env.storage().instance().set(&DataKey::NFTOwner(token_id), &to);
        
        let mut total_supply: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        total_supply += 1;
        env.storage().instance().set(&DataKey::TotalSupply, &total_supply);

        env.events().publish((NFTEvent::Mint, to.clone(), token_id), ());
    }

    fn owner_of(env: Env, token_id: u32) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::NFTOwner(token_id))
            .expect("token_does_not_exist")
    }

    fn transfer(env: Env, from: Address, to: Address, token_id: u32) {
        from.require_auth();
        
        let current_owner = Self::owner_of(env.clone(), token_id);
        if current_owner != from {
            panic!("not_owner");
        }

        env.storage().instance().set(&DataKey::NFTOwner(token_id), &to);
        env.events().publish((NFTEvent::Transfer, from, to, token_id), ());
    }

    fn approve(env: Env, approved: Address, token_id: u32) {
        let owner = Self::owner_of(env.clone(), token_id);
        owner.require_auth();
        
        env.storage().instance().set(&DataKey::NFTMetadata(token_id), &approved);
    }

    fn get_approved(env: Env, token_id: u32) -> Option<Address> {
        env.storage()
            .instance()
            .get(&DataKey::NFTMetadata(token_id))
    }

    fn balance_of(env: Env, owner: Address) -> u32 {
        // This is a simplified implementation - in production, you'd want
        // to maintain a balance mapping for efficiency
        let total_supply: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        
        let mut balance = 0;
        for token_id in 0..total_supply {
            if let Some(token_owner) = env.storage().instance().get(&DataKey::NFTOwner(token_id)) {
                if token_owner == owner {
                    balance += 1;
                }
            }
        }
        balance
    }

    fn token_uri(env: Env, token_id: u32) -> Bytes {
        // Return metadata URI for the vesting position
        let token_id_str = token_id.to_string();
        let mut uri = "https://api.example.com/metadata/".to_string();
        uri.push_str(&token_id_str);
        Bytes::from_slice(&env, uri.as_bytes())
    }

    fn name(env: Env) -> Bytes {
        env.storage()
            .instance()
            .get(&DataKey::Name)
            .unwrap_or_else(|| Bytes::from_slice(&env, b"Vesting Vault NFT"))
    }

    fn symbol(env: Env) -> Bytes {
        env.storage()
            .instance()
            .get(&DataKey::Symbol)
            .unwrap_or_else(|| Bytes::from_slice(&env, b"VVNFT"))
    }

    fn total_supply(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }
}

fn build_leaf(env: &Env, index: u32, beneficiary: &Address, amount: i128) -> BytesN<32> {
    let payload = (index, beneficiary.clone(), amount);
    let bytes: Bytes = env.serialize(&payload);
    env.crypto().sha256(&bytes)
}

fn verify_merkle_proof(
    env: &Env,
    root: &BytesN<32>,
    leaf: &BytesN<32>,
    proof: &Vec<BytesN<32>>,
    index: u32,
) -> bool {
    let mut computed = leaf.clone();
    let mut idx = index;

    for p in proof.iter() {
        let payload = if idx % 2 == 0 {
            (computed.clone(), p.clone())
        } else {
            (p.clone(), computed.clone())
        };
        let bytes: Bytes = env.serialize(&payload);
        computed = env.crypto().sha256(&bytes);
        idx /= 2;
    }

    &computed == root
}

fn compute_vested(
    amount: i128,
    now: u64,
    start_time: u64,
    duration: u64,
    cliff: u64,
) -> i128 {
    let cliff_time = start_time.saturating_add(cliff);
    let end_time = start_time.saturating_add(duration);

    if now < cliff_time {
        return 0;
    }
    if now >= end_time {
        return amount;
    }

    let effective_start = cliff_time;
    let effective_duration = duration.saturating_sub(cliff);
    if effective_duration == 0 {
        return amount;
    }

    let elapsed = now.saturating_sub(effective_start) as i128;
    let eff_dur_i128 = effective_duration as i128;
    amount * elapsed / eff_dur_i128
}

#[cfg(test)]
mod test;
