require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Portfolio aggregation endpoint
app.get('/api/user/:address/portfolio', (req, res) => {
    const { address } = req.params;
    
    // Mock data for demonstration - replace with actual vault data
    const mockVaults = [
        { type: 'advisor', locked: 80, claimable: 15 },
        { type: 'investor', locked: 20, claimable: 5 }
    ];
    
    // Calculate totals
    const total_locked = mockVaults.reduce((sum, vault) => sum + vault.locked, 0);
    const total_claimable = mockVaults.reduce((sum, vault) => sum + vault.claimable, 0);
    
    res.json({ total_locked, total_claimable, vaults: mockVaults, address });
});

app.listen(port, () => console.log(`Vesting API running on port ${port}`));
