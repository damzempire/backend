# Running Vesting Vault Backend Locally

This guide will help you set up and run the Vesting Vault backend with the new historical price tracking feature.

## Prerequisites

1. **Node.js** (v16 or higher)
2. **PostgreSQL** (v15 or higher)
3. **Git**

## Setup Instructions

### 1. Database Setup

Install and start PostgreSQL:
```bash
# On Windows (using Chocolatey)
choco install postgresql15

# On macOS (using Homebrew)
brew install postgresql@15
brew services start postgresql@15

# On Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15
sudo systemctl start postgresql
```

Create the database:
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE vesting_vault;

# Create user (optional, if not using default postgres user)
CREATE USER vesting_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE vesting_vault TO vesting_user;
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env file with your database configuration
```

### 3. Environment Configuration

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vesting_vault
DB_USER=postgres
DB_PASSWORD=password

# Optional: CoinGecko API (for higher rate limits)
COINGECKO_API_KEY=your_api_key_here

# Stellar Network Configuration
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
```

### 4. Start the Application

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## Testing the Implementation

### Health Check
```bash
curl http://localhost:3000/health
```

### Test Historical Price Tracking
```bash
# Run the comprehensive test suite
node test/historicalPriceTracking.test.js
```

### Manual API Testing

#### Process a Single Claim
```bash
curl -X POST http://localhost:3000/api/claims \
  -H "Content-Type: application/json" \
  -d '{
    "user_address": "0x1234567890123456789012345678901234567890",
    "token_address": "0xA0b86a33E6441e6c8d0A1c9c8c8d8d8d8d8d8d8d",
    "amount_claimed": "100.5",
    "claim_timestamp": "2024-01-15T10:30:00Z",
    "transaction_hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    "block_number": 18500000
  }'
```

#### Get Realized Gains
```bash
curl "http://localhost:3000/api/claims/0x1234567890123456789012345678901234567890/realized-gains"
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -U postgres -l`

### API Rate Limits
- The CoinGecko API has rate limits
- Consider getting a CoinGecko API key for higher limits
- The implementation includes caching to minimize API calls

### Port Conflicts
- Change PORT in `.env` if 3000 is already in use
- Ensure no other application is using the same port

## Development Workflow

### Making Changes
1. Make your changes to the code
2. Run tests to verify functionality
3. Commit changes with descriptive messages
4. Push to your feature branch
5. Create a pull request

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
node test/historicalPriceTracking.test.js
```

### Database Migrations
The application uses Sequelize sync() for development. For production:
- Consider using proper migrations
- Backup database before schema changes

## API Documentation

See `HISTORICAL_PRICE_TRACKING.md` for detailed API documentation and usage examples.

## Production Deployment

For production deployment:
1. Use environment variables for all configuration
2. Enable proper logging
3. Set up database connection pooling
4. Configure reverse proxy (nginx)
5. Set up monitoring and alerting
6. Use proper SSL certificates

## Support

If you encounter issues:
1. Check the logs for error messages
2. Verify all prerequisites are installed
3. Ensure database is running and accessible
4. Check network connectivity for external API calls
