#!/usr/bin/env node

/**
 * Sample Data Generator for TVL-Price Correlation Analysis
 * This script generates realistic historical data for testing purposes
 */

const { HistoricalTVL, HistoricalTokenPrice } = require('./src/models');
const { sequelize } = require('./src/database/connection');

// Configuration
const config = {
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
  baseTVL: 1000000, // $1M starting TVL
  basePrice: 1.00,   // $1.00 starting price
  volatility: 0.05,  // 5% daily volatility
  trend: 0.001,      // 0.1% daily upward trend
  correlationStrength: -0.4 // Negative correlation between TVL and price changes
};

/**
 * Generate random normal distribution value
 */
function randomNormal(mean = 0, stdDev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

/**
 * Generate correlated random values
 */
function generateCorrelatedValues(baseValue, volatility, correlationFactor, previousValue = null) {
  const randomShock = randomNormal(0, volatility);
  const trendComponent = config.trend;
  
  // Add correlation component based on previous value
  let correlationComponent = 0;
  if (previousValue !== null) {
    correlationComponent = correlationFactor * Math.log(previousValue / baseValue) * 0.1;
  }
  
  const change = trendComponent + randomShock + correlationComponent;
  const newValue = previousValue ? previousValue * (1 + change) : baseValue;
  
  return {
    value: Math.max(newValue, baseValue * 0.5), // Prevent negative values
    change: change
  };
}

/**
 * Generate sample historical TVL data
 */
async function generateHistoricalTVL() {
  console.log('📊 Generating Historical TVL Data...');
  
  const records = [];
  let currentTVL = config.baseTVL;
  let currentDate = new Date(config.startDate);
  
  while (currentDate <= config.endDate) {
    const { value: newTVL, change } = generateCorrelatedValues(
      config.baseTVL, 
      config.volatility * 1.5, // Higher volatility for TVL
      0, // No correlation for TVL (it drives the correlation)
      currentTVL
    );
    
    const previousTVL = currentTVL;
    currentTVL = newTVL;
    
    // Calculate 24h change
    const change24h = currentTVL - previousTVL;
    const changePercentage24h = (change24h / previousTVL) * 100;
    
    records.push({
      snapshot_date: currentDate.toISOString().split('T')[0],
      total_value_locked: currentTVL.toFixed(2),
      active_vaults_count: Math.floor(50 + Math.random() * 100), // 50-150 vaults
      tvl_change_24h: change24h.toFixed(2),
      tvl_change_percentage_24h: changePercentage24h.toFixed(6),
      total_vault_balance: (currentTVL * 1.1).toFixed(2), // Raw token amount
      token_address: '0x1234567890123456789012345678901234567890', // Mock token address
      snapshot_timestamp: new Date(currentDate.getTime() + Math.random() * 86400000), // Random time during day
      data_quality: Math.random() > 0.1 ? 'excellent' : 'good', // 90% excellent, 10% good
      created_at: new Date(),
      updated_at: new Date()
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Insert records in batches
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await HistoricalTVL.bulkCreate(batch, { ignoreDuplicates: true });
  }
  
  console.log(`✅ Generated ${records.length} TVL records`);
  return records;
}

/**
 * Generate sample historical price data
 */
async function generateHistoricalPrices(tvlRecords) {
  console.log('💰 Generating Historical Price Data...');
  
  const records = [];
  let currentPrice = config.basePrice;
  
  for (const tvlRecord of tvlRecords) {
    const { value: newPrice } = generateCorrelatedValues(
      config.basePrice,
      config.volatility,
      config.correlationStrength, // Negative correlation with TVL
      currentPrice
    );
    
    const previousPrice = currentPrice;
    currentPrice = newPrice;
    
    // Calculate additional price metrics
    const volume24h = randomNormal(100000, 50000); // $100K ± $50K volume
    const marketCap = currentPrice * 10000000; // 10M supply
    
    records.push({
      token_address: '0x1234567890123456789012345678901234567890',
      price_date: tvlRecord.snapshot_date,
      price_usd: currentPrice.toFixed(6),
      vwap_24h_usd: (currentPrice * (1 + randomNormal(0, 0.01))).toFixed(6),
      volume_24h_usd: Math.max(volume24h, 10000).toFixed(2),
      market_cap_usd: marketCap.toFixed(2),
      price_source: 'stellar_dex',
      data_quality: Math.random() > 0.15 ? 'excellent' : 'good', // 85% excellent, 15% good
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  
  // Insert records in batches
  const batchSize = 50;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    await HistoricalTokenPrice.bulkCreate(batch, { ignoreDuplicates: true });
  }
  
  console.log(`✅ Generated ${records.length} price records`);
  return records;
}

/**
 * Main function to generate all sample data
 */
async function generateSampleData() {
  try {
    console.log('🚀 Starting Sample Data Generation...\n');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    
    // Clear existing sample data
    console.log('\n🧹 Clearing existing sample data...');
    await HistoricalTVL.destroy({ 
      where: {
        snapshot_date: {
          [require('sequelize').Op.between]: [
            config.startDate.toISOString().split('T')[0],
            config.endDate.toISOString().split('T')[0]
          ]
        }
      }
    });
    
    await HistoricalTokenPrice.destroy({ 
      where: {
        price_date: {
          [require('sequelize').Op.between]: [
            config.startDate.toISOString().split('T')[0],
            config.endDate.toISOString().split('T')[0]
          ]
        }
      }
    });
    console.log('✅ Existing data cleared');
    
    // Generate TVL data first
    const tvlRecords = await generateHistoricalTVL();
    
    // Generate price data based on TVL
    await generateHistoricalPrices(tvlRecords);
    
    console.log('\n🎉 Sample data generation completed successfully!');
    console.log(`📅 Date Range: ${config.startDate.toISOString().split('T')[0]} to ${config.endDate.toISOString().split('T')[0]}`);
    console.log(`📊 Total TVL Records: ${tvlRecords.length}`);
    console.log(`💰 Total Price Records: ${tvlRecords.length}`);
    console.log(`🔗 Expected Correlation: ${config.correlationStrength} (negative)`);
    
    console.log('\n📈 You can now test the correlation analysis:');
    console.log('curl "http://localhost:4000/api/correlation/analysis"');
    console.log('curl "http://localhost:4000/api/correlation/chart"');
    console.log('curl "http://localhost:4000/api/correlation/insights"');
    
  } catch (error) {
    console.error('❌ Error generating sample data:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  generateSampleData();
}

module.exports = { generateSampleData, config };
