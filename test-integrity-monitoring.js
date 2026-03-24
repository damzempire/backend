const IntegrityMonitoringJob = require('./backend/src/jobs/integrityMonitoringJob');
const { Vault } = require('./backend/src/models');
const notificationService = require('./backend/src/services/notificationService');
const { xdr } = require('stellar-sdk');

// Mock objects
const mockVaults = [
  {
    id: 'v1',
    address: 'CD5QF6KBAURVUNZR2EVBJISWSEYGDGEEYVH2XYJJADKT7KFOXTTIXLHU',
    is_active: true,
    is_blacklisted: false,
    update: async (data) => {
      console.log(`Vault v1 updated: ${JSON.stringify(data)}`);
      mockVaults[0].is_active = data.is_active;
      mockVaults[0].is_blacklisted = data.is_blacklisted;
    }
  },
  {
    id: 'v2',
    address: 'GD6QF6KBAURVUNZR2EVBJISWSEYGDGEEYVH2XYJJADKT7KFOXTTIXLH2',
    is_active: true,
    is_blacklisted: false,
    update: async (data) => {
      console.log(`Vault v2 updated: ${JSON.stringify(data)}`);
      mockVaults[1].is_active = data.is_active;
      mockVaults[1].is_blacklisted = data.is_blacklisted;
    }
  }
];

// Mock Vault.findAll
Vault.findAll = async () => mockVaults.filter(v => v.is_active && !v.is_blacklisted);

// Mock notificationService.notifyIntegrityFailure
notificationService.notifyIntegrityFailure = async (vault) => {
  console.log(`Notification sent for vault ${vault.address}`);
};

// Mock IntegrityMonitoringJob.getContractWasmHash
const approvedHash = '7792a624b562b3d9414792f5fb5d72f53b9838fef2ed9a901471253970bc3b15';
const maliciousHash = 'badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad';

IntegrityMonitoringJob.approvedHash = approvedHash;

IntegrityMonitoringJob.getContractWasmHash = async (address) => {
  if (address === mockVaults[0].address) return approvedHash; // OK
  if (address === mockVaults[1].address) return maliciousHash; // FAILED
  return null;
};

async function runTest() {
  console.log('--- Starting Integrity Monitoring Test ---');
  
  console.log('Active vaults before:', (await Vault.findAll()).map(v => v.address));
  
  await IntegrityMonitoringJob.monitorIntegrity();
  
  const remainingVaults = await Vault.findAll();
  console.log('Active vaults after:', remainingVaults.map(v => v.address));
  
  if (remainingVaults.length === 1 && remainingVaults[0].address === mockVaults[0].address) {
    console.log('TEST PASSED: Malicious vault was blacklisted.');
  } else {
    console.error('TEST FAILED: Integrity monitoring did not work as expected.');
  }
}

runTest().catch(console.error);
