# PowerShell build script for Windows

# Build all contracts
Write-Host "Building vesting vault contract..."
Set-Location vesting-vault
cargo build --target wasm32-unknown-unknown --release

Write-Host "Building malicious contract..."
Set-Location ..\malicious-contract
cargo build --target wasm32-unknown-unknown --release

Write-Host "Building reentrancy tests..."
Set-Location ..\reentrancy-tests
cargo build --target wasm32-unknown-unknown --release

Write-Host "Running tests..."
cargo test

Write-Host "Build and tests completed!"
Set-Location ..
