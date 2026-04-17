// Deployment script for Vesting Vault Backend
const { exec } = require('child_process');
const express = require('express');
const cors = require('cors');

console.log('🚀 Starting deployment process...');

// Install dependencies
exec('npm install', (error, stdout, stderr) => {
    if (error) {
        console.error(`❌ npm install failed: ${error}`);
        return;
    }
    console.log('✅ Dependencies installed');
    
    // Start the Express server directly in this script for simplicity in deployment context
    const app = express();
    const port = process.env.PORT || 3000;

    app.use(cors());
    app.use(express.json());

    // Placeholder for the new portfolio aggregation endpoint
    app.get('/api/user/:address/portfolio', (req, res) => {
        const { address } = req.params;
        // Mock data for demonstration - replace with actual vault data
        const mockVaults = [
            { type: 'advisor', locked: 80, claimable: 15 },
            { type: 'investor', locked: 20, claimable: 5 }
        ];
        const total_locked = mockVaults.reduce((sum, vault) => sum + vault.locked, 0);
        const total_claimable = mockVaults.reduce((sum, vault) => sum + vault.claimable, 0);
        res.json({ total_locked, total_claimable, vaults: mockVaults, address });
    });

    app.listen(port, () => {
        console.log(`🌟 Vesting Vault API running on port ${port}`);
        console.log('📍 Portfolio endpoint: http://localhost:3000/api/user/:address/portfolio');
        console.log('🧪 Test with: node test-endpoint.js');
    });
});
