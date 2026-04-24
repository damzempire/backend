const fs = require('fs');
const path = require('path');
const { pool } = require('../models/database');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting database migration...');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await client.query('BEGIN');
    
    // Execute schema
    await client.query(schema);
    
    await client.query('COMMIT');
    
    console.log('✅ Database migration completed successfully!');
    console.log('📋 Tables created:');
    console.log('   - investors');
    console.log('   - languages');
    console.log('   - token_purchase_agreements');
    console.log('   - legal_agreement_hashes');
    console.log('   - legal_agreement_audit_log');
    console.log('🌍 Default languages inserted: English, Spanish, Mandarin, French, German, Japanese, Korean');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
