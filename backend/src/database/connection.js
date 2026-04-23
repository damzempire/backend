const { Sequelize } = require('sequelize');

let writeSequelize;
let readSequelize;
let readReplicas = [];

// Initialize database connections
function initializeConnections() {
  const isClusterMode = process.env.DB_CLUSTER_MODE === 'true';
  
  if (process.env.NODE_ENV === 'test') {
    // Use SQLite in-memory for tests — no Postgres required
    writeSequelize = new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false,
    });
    readSequelize = writeSequelize;
  } else if (isClusterMode) {
    // Cluster mode with read/write splitting
    writeSequelize = new Sequelize(
      process.env.DB_WRITE_NAME || 'vesting_vault',
      process.env.DB_WRITE_USER || 'postgres',
      process.env.DB_WRITE_PASSWORD || 'password',
      {
        host: process.env.DB_WRITE_HOST || 'localhost',
        port: process.env.DB_WRITE_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 20,
          min: 5,
          acquire: 30000,
          idle: 10000
        }
      }
    );

    // Read connection (to replicas via PgBouncer)
    readSequelize = new Sequelize(
      process.env.DB_READ_NAME || 'vesting_vault',
      process.env.DB_READ_USER || 'postgres',
      process.env.DB_READ_PASSWORD || 'password',
      {
        host: process.env.DB_READ_HOST || 'localhost',
        port: process.env.DB_READ_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 40,
          min: 10,
          acquire: 30000,
          idle: 10000
        },
        // Read-only configuration
        readOnly: true
      }
    );

    // Initialize read replicas array for load balancing
    const replicaHosts = (process.env.DB_READ_HOSTS || '').split(',').filter(Boolean);
    readReplicas = replicaHosts.map(host => 
      new Sequelize(
        process.env.DB_READ_NAME || 'vesting_vault',
        process.env.DB_READ_USER || 'postgres',
        process.env.DB_READ_PASSWORD || 'password',
        {
          host: host.trim(),
          port: process.env.DB_READ_PORT || 5432,
          dialect: 'postgres',
          logging: false,
          pool: {
            max: 20,
            min: 5,
            acquire: 30000,
            idle: 10000
          },
          readOnly: true
        }
      )
    );
  } else {
    // Single database instance (legacy mode)
    writeSequelize = new Sequelize(
      process.env.DB_NAME || 'vesting_vault',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'password',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
      }
    );
    readSequelize = writeSequelize;
  }
}

// Initialize connections immediately
initializeConnections();

// Get appropriate database connection based on operation type
function getDatabaseConnection(operation = 'read') {
  const isClusterMode = process.env.DB_CLUSTER_MODE === 'true';
  
  if (!isClusterMode) {
    return writeSequelize; // Single instance mode
  }

  if (operation === 'write' || operation === 'create' || operation === 'update' || operation === 'delete') {
    return writeSequelize;
  }

  if (operation === 'read') {
    // Load balance between read replicas
    if (readReplicas.length > 0) {
      const randomIndex = Math.floor(Math.random() * readReplicas.length);
      return readReplicas[randomIndex];
    }
    return readSequelize;
  }

  // Default to read connection for safety
  return readSequelize;
}

// Enhanced connection function with failover support
function getDatabaseConnectionWithFailover(operation = 'read') {
  const isClusterMode = process.env.DB_CLUSTER_MODE === 'true';
  
  if (!isClusterMode) {
    return writeSequelize; // Single instance mode
  }

  // Import failover service
  try {
    const failoverService = require('../services/databaseFailoverService');
    return failoverService.getConnectionWithFailover(operation);
  } catch (error) {
    // Fallback to basic connection if failover service is not available
    console.warn('Failover service not available, using basic connection routing');
    return getDatabaseConnection(operation);
  }
}

// Health check function
async function checkDatabaseHealth() {
  const isClusterMode = process.env.DB_CLUSTER_MODE === 'true';
  const health = {
    write: false,
    read: false,
    replicas: []
  };

  try {
    await writeSequelize.authenticate();
    health.write = true;
  } catch (error) {
    console.error('Write database health check failed:', error.message);
  }

  try {
    await readSequelize.authenticate();
    health.read = true;
  } catch (error) {
    console.error('Read database health check failed:', error.message);
  }

  // Check individual replicas
  for (let i = 0; i < readReplicas.length; i++) {
    try {
      await readReplicas[i].authenticate();
      health.replicas.push({ index: i, healthy: true });
    } catch (error) {
      health.replicas.push({ index: i, healthy: false, error: error.message });
    }
  }

  return health;
}

// Replica lag check
async function checkReplicaLag() {
  const isClusterMode = process.env.DB_CLUSTER_MODE === 'true';
  
  if (!isClusterMode || readReplicas.length === 0) {
    return 0;
  }

  try {
    // Get master WAL position
    const [masterResult] = await writeSequelize.query(`
      SELECT pg_current_wal_lsn() as current_lsn
    `);
    
    const masterLsn = masterResult[0]?.current_lsn;
    if (!masterLsn) return 0;

    // Check replica lag
    let maxLag = 0;
    for (const replica of readReplicas) {
      try {
        const [replicaResult] = await replica.query(`
          SELECT pg_last_wal_replay_lsn() as replay_lsn
        `);
        
        const replicaLsn = replicaResult[0]?.replay_lsn;
        if (replicaLsn) {
          const lag = await writeSequelize.query(`
            SELECT pg_wal_lsn_diff('${masterLsn}', '${replicaLsn}') as lag_bytes
          `);
          maxLag = Math.max(maxLag, parseInt(lag[0][0]?.lag_bytes || 0));
        }
      } catch (error) {
        console.error('Replica lag check failed:', error.message);
      }
    }

    return maxLag;
  } catch (error) {
    console.error('Replica lag check failed:', error.message);
    return 0;
  }
}

module.exports = { 
  sequelize: writeSequelize, // Default for backward compatibility
  writeSequelize,
  readSequelize,
  readReplicas,
  getDatabaseConnection,
  getDatabaseConnectionWithFailover,
  checkDatabaseHealth,
  checkReplicaLag,
  initializeConnections
};
