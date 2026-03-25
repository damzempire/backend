const { sequelize } = require('./src/database/connection');
const { Vault, SubSchedule } = require('./src/models');
const vestingService = require('./src/services/vestingService');

async function testProjection() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // 1. Create a dummy vault
    const vault = await Vault.create({
      vault_address: '0x' + Math.random().toString(16).slice(2),
      token_address: '0x' + Math.random().toString(16).slice(2),
      owner_address: '0x' + Math.random().toString(16).slice(2),
      total_amount: 1000,
      name: 'Test Projection Vault'
    });
    console.log('Created Vault:', vault.id);

    // 2. Create sub-schedules
    const now = new Date();
    const startDate = new Date(now.getTime());
    
    // Schedule 1: 500 tokens, 1 day cliff, 10 days vesting
    await SubSchedule.create({
      vault_id: vault.id,
      top_up_amount: 500,
      top_up_timestamp: startDate,
      cliff_date: new Date(startDate.getTime() + 86400 * 1000), // 1 day
      vesting_start_date: new Date(startDate.getTime() + 86400 * 1000),
      vesting_duration: 86400 * 10, // 10 days
      created_at: startDate
    });

    // Schedule 2: 500 tokens, no cliff, 5 days vesting
    await SubSchedule.create({
      vault_id: vault.id,
      top_up_amount: 500,
      top_up_timestamp: startDate,
      vesting_start_date: startDate,
      vesting_duration: 86400 * 5, // 5 days
      created_at: startDate
    });

    // 3. Get Projection
    console.log('Fetching projection...');
    const projection = await vestingService.getVaultProjection(vault.id);
    console.log('Projection Result:', JSON.stringify(projection, null, 2));

    // Cleanup
    await SubSchedule.destroy({ where: { vault_id: vault.id } });
    await Vault.destroy({ where: { id: vault.id } });

  } catch (error) {
    console.error('Test Failed:', error);
  } finally {
    await sequelize.close();
  }
}

testProjection();
