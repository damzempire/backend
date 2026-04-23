/**
 * Mainnet Sanity Check Simulation
 * This script simulates 100 claims, 10 revocations, and 5 admin changes
 * on a local fork (simulated via SQLite in-memory).
 */

const crypto = require('crypto');

// Set environment to test to use SQLite in-memory
process.env.NODE_ENV = 'test';

const { sequelize } = require('../backend/src/database/connection');
const { Vault, Beneficiary, SubSchedule } = require('../backend/src/models');
const vestingService = require('../backend/src/services/vestingService');
const adminService = require('../backend/src/services/adminService');

// Helper to generate a random Stellar-like address (starts with G, length 56)
function generateStellarAddress() {
  return 'G' + crypto.randomBytes(27).toString('hex').toUpperCase().substring(0, 55);
}

// Helper to generate a random TX hash
function generateTxHash() {
  return crypto.randomBytes(32).toString('hex');
}

async function runSimulation() {
  try {
    console.log('🏗️  Initializing database schema...');
    await sequelize.sync({ force: true });
    console.log('✅ Database schema initialized.');

    const vaultAddress = process.argv[2] || generateStellarAddress();
    const ownerAddress = generateStellarAddress();
    const tokenAddress = generateStellarAddress();
    const adminAddress = generateStellarAddress();

    console.log(`🏦 Creating vault ${vaultAddress}...`);
    const vault = await vestingService.createVault({
      address: vaultAddress,
      owner_address: ownerAddress,
      token_address: tokenAddress,
      total_amount: 10000000, // $10M
      name: 'Mainnet Sanity Vault',
      adminAddress: adminAddress
    });

    // Add 100 beneficiaries
    console.log('👥 Adding 100 beneficiaries...');
    const beneficiaries = [];
    for (let i = 0; i < 100; i++) {
        const bAddress = generateStellarAddress();
        const beneficiary = await Beneficiary.create({
            vault_id: vault.id,
            address: bAddress,
            total_allocated: 100000, // 100k each
            total_withdrawn: 0
        });
        beneficiaries.push(beneficiary);
    }

    // Add initial subschedule
    await SubSchedule.create({
        vault_id: vault.id,
        top_up_amount: 10000000,
        vesting_start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
        vesting_duration: 365 * 24 * 60 * 60, // 1 year
        end_timestamp: new Date(),
        is_active: true
    });

    let totalWithdrawn = 0;

    // Simulate 100 claims
    console.log('💰 Simulating 100 claims...');
    for (let i = 0; i < 100; i++) {
        const beneficiary = beneficiaries[i];
        const claimAmount = 50000; // Claim half
        await vestingService.processWithdrawal({
            vault_address: vaultAddress,
            beneficiary_address: beneficiary.address,
            amount: claimAmount,
            transaction_hash: generateTxHash()
        });
        totalWithdrawn += claimAmount;
    }
    console.log(`✅ 100 claims completed. Total withdrawn: ${totalWithdrawn}`);

    // Simulate 10 revocations
    console.log('🚫 Simulating 10 revocations...');
    for (let i = 0; i < 10; i++) {
        const beneficiary = beneficiaries[i + 90]; // Last 10
        await vestingService.calculateCleanBreak(vaultAddress, beneficiary.address, new Date());
        // In local logic, if we actually want to revoke, we'd mark them as inactive or adjust amounts
        // For this sanity check, we call the calculation to ensure it works.
        await beneficiary.update({ is_active: false });
    }
    console.log('✅ 10 revocations simulated.');

    // Simulate 5 admin changes
    console.log('🔑 Simulating 5 admin changes...');
    let currentAdmin = adminAddress;
    for (let i = 0; i < 5; i++) {
        const nextAdmin = generateStellarAddress();
        const result = await adminService.proposeNewAdmin(currentAdmin, nextAdmin, vaultAddress);
        await adminService.acceptOwnership(nextAdmin, result.transferId);
        currentAdmin = nextAdmin;
    }
    console.log('✅ 5 admin changes simulated.');

    // Final balance check 
    console.log('⚖️  Performing final balance check...');
    const finalVault = await Vault.findByPk(vault.id);
    const expectedRemaining = 10000000 - totalWithdrawn;
    
    // In our simplified simulation, we're just checking that the database states match.
    // In a real mainnet fork test, we'd check actual token balances on-chain.
    
    console.log(`📊 Sum of beneficiary withdrawals: ${totalWithdrawn}`);
    console.log(`📊 Vault total amount (initial): ${finalVault.total_amount}`);
    
    const sumWithdrawn = await Beneficiary.sum('total_withdrawn', { where: { vault_id: vault.id } });
    if (Math.abs(sumWithdrawn - totalWithdrawn) < 0.0001) {
        console.log('✅ BALANCE ACCURACY: 100%');
    } else {
        console.error(`❌ BALANCE MISMATCH: Expected ${totalWithdrawn}, found ${sumWithdrawn}`);
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Simulation failed:', error);
    process.exit(1);
  }
}

runSimulation();
