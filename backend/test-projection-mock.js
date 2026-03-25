const { Vault } = require('./src/models');
const vestingService = require('./src/services/vestingService');

console.log('Vault:', Vault);

// Mock Vault.findOne
Vault.findOne = async (options) => {
  console.log('Mock Vault.findOne called with:', options);
  return {
    id: 'mock-vault-id',
    subSchedules: [
      {
        top_up_amount: '500',
        top_up_timestamp: new Date('2024-01-01T00:00:00Z'),
        cliff_date: new Date('2024-01-02T00:00:00Z'), // 1 day cliff
        vesting_start_date: new Date('2024-01-02T00:00:00Z'),
        vesting_duration: 86400 * 10, // 10 days
        created_at: new Date('2024-01-01T00:00:00Z')
      },
      {
        top_up_amount: '500',
        top_up_timestamp: new Date('2024-01-01T00:00:00Z'),
        cliff_date: null,
        vesting_start_date: new Date('2024-01-01T00:00:00Z'),
        vesting_duration: 86400 * 5, // 5 days
        created_at: new Date('2024-01-01T00:00:00Z')
      }
    ]
  };
};

async function test() {
  console.log('Starting test...');
  try {
    const projection = await vestingService.getVaultProjection('mock-vault-id');
    console.log('Projection Result:');
    console.log(JSON.stringify(projection, null, 2));
  } catch (err) {
    console.error('Test Error:', err);
  }
}

test();
