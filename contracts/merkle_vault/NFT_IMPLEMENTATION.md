# NFT Implementation for Merkle Vault

## Overview

This implementation replaces the boolean `is_transferable` flag with a standard Soroban NFT that represents ownership of vesting positions. The NFT follows ERC721-like standards adapted for Soroban.

## Key Changes

### 1. NFT Standard Interface

Implemented `NFTInterface` trait with the following methods:
- `mint(to, token_id)` - Mint new NFT
- `owner_of(token_id)` - Get current owner
- `transfer(from, to, token_id)` - Transfer ownership
- `approve(approved, token_id)` - Approve transfer
- `get_approved(token_id)` - Get approved address
- `balance_of(owner)` - Get balance for owner
- `token_uri(token_id)` - Get metadata URI
- `name()` - Get NFT collection name
- `symbol()` - Get NFT collection symbol
- `total_supply()` - Get total NFTs minted

### 2. Storage Changes

Added new storage keys:
- `NFTOwner(u32)` - Maps token_id to owner address
- `NFTMetadata(u32)` - Stores approved addresses
- `Name` - NFT collection name
- `Symbol` - NFT collection symbol
- `TotalSupply` - Total NFTs minted

### 3. Modified Functions

#### `init()`
Now accepts `name` and `symbol` parameters for NFT metadata initialization.

#### `claim_merkle()`
Now strictly checks that the caller owns the NFT for the vesting position before allowing claims.

#### New `mint_vesting_nft()`
Allows minting NFTs for valid vesting positions after Merkle proof verification.

### 4. Events

Added NFT events:
- `Mint(to, token_id)` - Emitted when NFT is minted
- `Transfer(from, to, token_id)` - Emitted when NFT is transferred

## Usage Flow

1. **Initialize Contract**: Call `init()` with admin, token, name, and symbol
2. **Setup Vesting**: Call `initialize_merkle_vault()` with Merkle root
3. **Mint NFT**: Users call `mint_vesting_nft()` with valid Merkle proof
4. **Transfer NFT**: NFT owners can transfer using `transfer()`
5. **Claim Tokens**: Only current NFT owner can call `claim_merkle()`

## Security Features

- **Ownership Verification**: Claims only allowed for current NFT owner
- **Merkle Proof Validation**: NFT minting requires valid Merkle proof
- **Admin Authorization**: Only admin can mint NFTs directly
- **Transfer Control**: NFT transfers require owner authentication

## Benefits

- **Interoperability**: Standard NFT interface works with existing NFT marketplaces
- **Transferability**: Vesting positions can be freely traded as NFTs
- **Transparency**: Clear ownership tracking on-chain
- **Flexibility**: NFTs can be used in DeFi protocols

## Testing

The implementation includes tests for:
- NFT metadata functionality
- Minting and ownership
- Transfer operations
- Claim restrictions based on NFT ownership
