# Merkle Vault (Issue #51)

Merkle tree-based vesting airdrops: one vault, one Merkle root; users claim streaming tokens with a proof.

## Contract

- **init**(admin, token) – one-time setup
- **initialize_merkle_vault**(root_hash, total_amount, duration, cliff) – commit root and vesting params; admin must fund the contract with `total_amount` first
- **claim_merkle**(proof, index, amount) – verify proof against root, then compute vested amount and transfer
- **get_merkle_root**() – read current root
- **get_claimed**(index) – read claimed amount for an index

Leaf encoding: `SHA256(Soroban_serialize(index, beneficiary_address, amount))`. Off-chain tree builders must use the same encoding so proofs verify.

## Build

```bash
cd contracts/merkle_vault
cargo build --target wasm32-unknown-unknown --release
```

## Backend

The backend provides `POST /api/merkle-vault/build-tree` with body `{ "entries": [ { "index", "address", "amount" } ] }`. It returns `rootHash`, `totalAmount`, and `proofsByIndex`. Leaf encoding used there is canonical (4+32+16 bytes); use a contract that matches that encoding, or generate leaves with a Soroban-compatible serializer.
