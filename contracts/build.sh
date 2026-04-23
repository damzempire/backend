#!/bin/bash

# Build all contracts
echo "Building vesting vault contract..."
cd vesting-vault
cargo build --target wasm32-unknown-unknown --release

echo "Building malicious contract..."
cd ../malicious-contract
cargo build --target wasm32-unknown-unknown --release

echo "Building reentrancy tests..."
cd ../reentrancy-tests
cargo build --target wasm32-unknown-unknown --release

echo "Running tests..."
cargo test

echo "Build and tests completed!"
