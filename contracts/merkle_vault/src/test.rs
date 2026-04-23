use soroban_sdk::{Address, Bytes, BytesN, Env, Vec};

#[test]
fn test_nft_functionality() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let user = Address::generate(&env);
    let name = Bytes::from_slice(&env, b"Vesting Vault NFT");
    let symbol = Bytes::from_slice(&env, b"VVNFT");

    // Initialize contract
    merkle_vault::MerkleVault::init(env.clone(), admin.clone(), token.clone(), name, symbol);

    // Test NFT metadata
    assert_eq!(merkle_vault::MerkleVault::name(env.clone()), Bytes::from_slice(&env, b"Vesting Vault NFT"));
    assert_eq!(merkle_vault::MerkleVault::symbol(env.clone()), Bytes::from_slice(&env, b"VVNFT"));
    assert_eq!(merkle_vault::MerkleVault::total_supply(env.clone()), 0);

    // Test minting NFT
    merkle_vault::MerkleVault::mint(env.clone(), user.clone(), 1);
    
    assert_eq!(merkle_vault::MerkleVault::owner_of(env.clone(), 1), user);
    assert_eq!(merkle_vault::MerkleVault::total_supply(env.clone()), 1);
    assert_eq!(merkle_vault::MerkleVault::balance_of(env.clone(), user), 1);

    // Test transfer
    let new_user = Address::generate(&env);
    merkle_vault::MerkleVault::transfer(env.clone(), user.clone(), new_user.clone(), 1);
    assert_eq!(merkle_vault::MerkleVault::owner_of(env.clone(), 1), new_user);
    assert_eq!(merkle_vault::MerkleVault::balance_of(env.clone(), user), 0);
    assert_eq!(merkle_vault::MerkleVault::balance_of(env.clone(), new_user), 1);
}

#[test]
fn test_claim_requires_nft_ownership() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let user = Address::generate(&env);
    let other_user = Address::generate(&env);
    let name = Bytes::from_slice(&env, b"Vesting Vault NFT");
    let symbol = Bytes::from_slice(&env, b"VVNFT");

    // Initialize contract
    merkle_vault::MerkleVault::init(env.clone(), admin.clone(), token.clone(), name, symbol);

    // This should fail because NFT doesn't exist
    let proof = Vec::new(&env);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        merkle_vault::MerkleVault::claim_merkle(env.clone(), proof, 1, 1000);
    }));
    assert!(result.is_err());
}
