const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Client } = require('pg');
const { Server } = require('stellar-sdk');
const { validateNetworkOnStartup } = require('./backend/src/jobs/networkValidation');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      stellar: 'unknown'
    }
  };

  let allHealthy = true;

  // Check database connection
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL || {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
      }
    });
    
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    health.services.database = 'healthy';
  } catch (error) {
    health.services.database = 'unhealthy';
    health.database_error = error.message;
    allHealthy = false;
  }

  // Check Stellar RPC connection
  try {
    if (!process.env.STELLAR_RPC_URL) {
      throw new Error('STELLAR_RPC_URL is not configured');
    }
    const stellarServer = new Server(process.env.STELLAR_RPC_URL);
    await stellarServer.root();
    health.services.stellar = 'healthy';
  } catch (error) {
    health.services.stellar = 'unhealthy';
    health.stellar_error = error.message;
    allHealthy = false;
  }

  if (allHealthy) {
    res.status(200).json(health);
  } else {
    health.status = 'degraded';
    res.status(503).json(health);
  }
});

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  const dbStatus = dbManager.getStatus();
  res.json({ 
    project: 'Vesting Vault', 
    status: 'Tracking Locked Tokens', 
    contract: process.env.VAULT_CONTRACT_ADDRESS,
    database: dbStatus
  });
});

async function startServer() {
  try {
    await validateNetworkOnStartup();
    app.listen(port, () => console.log(`Vesting API running on port ${port}`));
  } catch (error) {
    console.error('\n❌ Fatal Startup Error:', error.message, '\n');
    process.exit(1);
  }
}

startServer();
