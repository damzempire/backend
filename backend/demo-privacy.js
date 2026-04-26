/**
 * Demo script to test Privacy Masking functionality
 * This demonstrates the zero-knowledge privacy metadata masking for vault tokens
 */

const { 
  PRIVACY_TIERS, 
  maskTokenAmount, 
  getPrivacyTier, 
  hasUnmaskedPermission, 
  applyPrivacyMasking 
} = require('./src/utils/privacyMasking');

console.log('🔐 Privacy Masking Demo\n');

// Test 1: Basic token amount masking
console.log('1. Token Amount Masking:');
const testAmounts = [500, 5000, 25000, 75000, 250000, 750000, 2000000];
testAmounts.forEach(amount => {
  const masked = maskTokenAmount(amount);
  console.log(`   ${amount.toLocaleString()} tokens → ${masked.display_amount}`);
});

console.log('\n2. Privacy Tier Classification:');
testAmounts.forEach(amount => {
  const tier = getPrivacyTier(amount);
  console.log(`   ${amount.toLocaleString()} tokens → ${tier}`);
});

// Test 3: Permission checking
console.log('\n3. Permission Checking:');
const mockVault = {
  owner_address: '0xOWNER123',
  beneficiaries: [
    { address: '0xBENEFICIARY1' },
    { address: '0xBENEFICIARY2' }
  ]
};

const testUsers = [
  { address: '0xADMIN123', role: 'admin', description: 'Admin User' },
  { address: '0xOWNER123', description: 'Vault Owner' },
  { address: '0xBENEFICIARY1', description: 'Beneficiary' },
  { address: '0xUNAUTHORIZED', description: 'Random User' }
];

testUsers.forEach(user => {
  const hasPermission = hasUnmaskedPermission(user, mockVault);
  console.log(`   ${user.description}: ${hasPermission ? '✅ Can see real amounts' : '🔒 Will see masked amounts'}`);
});

// Test 4: End-to-end privacy masking
console.log('\n4. End-to-End Privacy Masking:');

const realisticVault = {
  id: 'vault-celebrity-123',
  address: '0xVAULT123',
  owner_address: '0xOWNER123',
  total_amount: 125000, // Celebrity founder wants to hide this
  privacy_mode_enabled: true,
  beneficiaries: [
    {
      address: '0xBENEFICIARY1',
      total_allocated: 75000,
      total_withdrawn: 25000
    }
  ]
};

console.log('\n   Original Vault Data:');
console.log(`   Total Amount: ${realisticVault.total_amount.toLocaleString()} tokens`);
console.log(`   Privacy Mode: ${realisticVault.privacy_mode_enabled ? 'Enabled' : 'Disabled'}`);

// Test unauthorized access (public view)
console.log('\n   🌍 Public View (Unauthorized User):');
const publicView = applyPrivacyMasking(realisticVault, { address: '0xPUBLIC' });
console.log(`   Total Amount: ${publicView.total_amount.display_amount}`);
console.log(`   Data Masked: ${publicView.data_masked ? 'Yes' : 'No'}`);

// Test authorized access (owner view)
console.log('\n   👑 Owner View (Authorized User):');
const ownerView = applyPrivacyMasking(realisticVault, { address: '0xOWNER123' });
console.log(`   Total Amount: ${ownerView.total_amount.toLocaleString()} tokens`);
console.log(`   Data Masked: ${ownerView.data_masked ? 'Yes' : 'No'}`);

console.log('\n✅ Demo completed successfully!');
console.log('\n📋 Summary:');
console.log('   • Privacy masking creates ranges instead of exact amounts');
console.log('   • Admins, owners, and beneficiaries see real amounts');
console.log('   • Public users see masked ranges like "Between 10k and 50k"');
console.log('   • This enables "Right to Financial Discretion" for high-profile investors');
