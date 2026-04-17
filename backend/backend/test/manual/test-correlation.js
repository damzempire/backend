#!/usr/bin/env node

/**
 * Test script for TVL-Price Correlation Analysis
 * This script validates the correlation service implementation
 */

const tvlPriceCorrelationService = require('./src/services/tvlPriceCorrelationService');

// Mock data for testing
const mockTVLData = [
  { snapshot_date: '2023-01-01', total_value_locked: '1000000' },
  { snapshot_date: '2023-01-02', total_value_locked: '1050000' },
  { snapshot_date: '2023-01-03', total_value_locked: '1020000' },
  { snapshot_date: '2023-01-04', total_value_locked: '1080000' },
  { snapshot_date: '2023-01-05', total_value_locked: '1100000' },
  { snapshot_date: '2023-01-06', total_value_locked: '1070000' },
  { snapshot_date: '2023-01-07', total_value_locked: '1120000' },
  { snapshot_date: '2023-01-08', total_value_locked: '1150000' },
  { snapshot_date: '2023-01-09', total_value_locked: '1130000' },
  { snapshot_date: '2023-01-10', total_value_locked: '1180000' }
];

const mockPriceData = [
  { price_date: '2023-01-01', price_usd: '1.00' },
  { price_date: '2023-01-02', price_usd: '1.02' },
  { price_date: '2023-01-03', price_usd: '0.98' },
  { price_date: '2023-01-04', price_usd: '1.05' },
  { price_date: '2023-01-05', price_usd: '1.08' },
  { price_date: '2023-01-06', price_usd: '1.03' },
  { price_date: '2023-01-07', price_usd: '1.10' },
  { price_date: '2023-01-08', price_usd: '1.12' },
  { price_date: '2023-01-09', price_usd: '1.07' },
  { price_date: '2023-01-10', price_usd: '1.15' }
];

async function testCorrelationService() {
  console.log('🧪 Testing TVL-Price Correlation Service...\n');

  try {
    // Test 1: Pearson Correlation Calculation
    console.log('📊 Test 1: Pearson Correlation Calculation');
    const tvlChanges = [0.05, -0.0286, 0.0588, 0.0185, -0.0273, 0.0467, 0.0268, -0.0174, 0.0442];
    const priceChanges = [0.02, -0.0392, 0.0714, 0.0286, -0.0463, 0.0680, 0.0182, -0.0446, 0.0748];
    
    const pearsonCorrelation = tvlPriceCorrelationService.calculatePearsonCorrelation(tvlChanges, priceChanges);
    console.log(`   Pearson Correlation: ${pearsonCorrelation.toFixed(4)}`);
    console.log(`   Interpretation: ${tvlPriceCorrelationService.interpretCorrelation(pearsonCorrelation)}\n`);

    // Test 2: Spearman Correlation Calculation
    console.log('📈 Test 2: Spearman Correlation Calculation');
    const spearmanCorrelation = tvlPriceCorrelationService.calculateSpearmanCorrelation(tvlChanges, priceChanges);
    console.log(`   Spearman Correlation: ${spearmanCorrelation.toFixed(4)}`);
    console.log(`   Interpretation: ${tvlPriceCorrelationService.interpretCorrelation(spearmanCorrelation)}\n`);

    // Test 3: Volatility Calculation
    console.log('📉 Test 3: Volatility Calculation');
    const priceVolatility = tvlPriceCorrelationService.calculateVolatility([1.00, 1.02, 0.98, 1.05, 1.08, 1.03, 1.10, 1.12, 1.07, 1.15]);
    const tvlVolatility = tvlPriceCorrelationService.calculateVolatility([1000000, 1050000, 1020000, 1080000, 1100000, 1070000, 1120000, 1150000, 1130000, 1180000]);
    
    console.log(`   Price Volatility: ${(priceVolatility * 100).toFixed(2)}%`);
    console.log(`   TVL Volatility: ${(tvlVolatility * 100).toFixed(2)}%\n`);

    // Test 4: Data Alignment
    console.log('🔄 Test 4: Data Alignment');
    const alignedData = tvlPriceCorrelationService.alignDataByDate(mockTVLData, mockPriceData);
    console.log(`   Aligned Data Points: ${alignedData.tvlChanges.length}`);
    console.log(`   Date Range: ${alignedData.dates[0]} to ${alignedData.dates[alignedData.dates.length - 1]}\n`);

    // Test 5: Marketing Insights Generation
    console.log('💡 Test 5: Marketing Insights Generation');
    const insights = tvlPriceCorrelationService.generateInsights(
      pearsonCorrelation, 
      spearmanCorrelation, 
      priceVolatility, 
      tvlVolatility
    );
    
    console.log(`   Generated ${insights.length} insights:`);
    insights.forEach((insight, index) => {
      console.log(`   ${index + 1}. ${insight.title}`);
      console.log(`      Marketing Angle: ${insight.marketingAngle}`);
      console.log(`      Impact: ${insight.impact}`);
    });
    console.log();

    // Test 6: Chart Data Generation
    console.log('📊 Test 6: Chart Data Generation');
    const chartData = {
      dates: alignedData.dates,
      tvlChanges: alignedData.tvlChanges.map(change => change * 100),
      priceChanges: alignedData.priceChanges.map(change => change * 100),
      tvls: alignedData.tvls,
      prices: alignedData.prices
    };
    
    console.log(`   Chart Data Points: ${chartData.dates.length}`);
    console.log(`   TVL Change Range: ${Math.min(...chartData.tvlChanges).toFixed(2)}% to ${Math.max(...chartData.tvlChanges).toFixed(2)}%`);
    console.log(`   Price Change Range: ${Math.min(...chartData.priceChanges).toFixed(2)}% to ${Math.max(...chartData.priceChanges).toFixed(2)}%\n`);

    console.log('✅ All tests passed successfully!');
    console.log('\n🎯 Marketing Summary:');
    console.log(`   Primary Insight: ${insights.find(i => i.impact === 'high')?.title || insights[0]?.title}`);
    console.log(`   Marketing Angle: ${insights.find(i => i.impact === 'high')?.marketingAngle || insights[0]?.marketingAngle}`);
    console.log(`   Correlation Evidence: ${pearsonCorrelation.toFixed(4)} (${tvlPriceCorrelationService.interpretCorrelation(pearsonCorrelation)})`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCorrelationService();
}

module.exports = { testCorrelationService, mockTVLData, mockPriceData };
