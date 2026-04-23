-- Vesting Vault Database Schema
-- Compatible with PostgreSQL (primary) and MySQL (secondary)

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vaults table
CREATE TABLE IF NOT EXISTS vaults (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    type ENUM('advisor', 'investor') CHECK (type IN ('advisor', 'investor')),
    total_locked DECIMAL(20, 8) DEFAULT 0,
    total_claimable DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_address) REFERENCES users(address)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    vault_id INTEGER NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    transaction_type ENUM('lock', 'claim') CHECK (transaction_type IN ('lock', 'claim')),
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vault_id) REFERENCES vaults(id)
);

-- Heartbeat table for monitoring
CREATE TABLE IF NOT EXISTS heartbeat_log (
    id SERIAL PRIMARY KEY,
    db_instance VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_time INTEGER,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vaults_user_address ON vaults(user_address);
CREATE INDEX IF NOT EXISTS idx_transactions_vault_id ON transactions(vault_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_checked_at ON heartbeat_log(checked_at);

-- Sample data for testing
INSERT INTO users (address) VALUES 
    ('0x1234567890abcdef1234567890abcdef12345678'),
    ('0xabcdef1234567890abcdef1234567890abcdef12')
ON CONFLICT (address) DO NOTHING;

INSERT INTO vaults (user_address, type, total_locked, total_claimable) VALUES 
    ('0x1234567890abcdef1234567890abcdef12345678', 'advisor', 80.0, 15.0),
    ('0x1234567890abcdef1234567890abcdef12345678', 'investor', 20.0, 5.0),
    ('0xabcdef1234567890abcdef1234567890abcdef12', 'advisor', 120.0, 25.0)
ON CONFLICT DO NOTHING;
