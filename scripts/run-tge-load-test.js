#!/usr/bin/env node

/**
 * TGE Load Testing Script
 * Usage: node scripts/run-tge-load-test.js [test-type]
 * 
 * Test types:
 *   - basic: Basic load test without authentication
 *   - comprehensive: Full TGE scenario with authentication
 *   - quick: Quick 30-second test
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_CONFIGS = {
  basic: {
    file: 'artillery-basic-load-test.yml',
    description: 'Basic API load test (no authentication)',
    estimatedTime: '10 minutes'
  },
  comprehensive: {
    file: 'artillery-tge-comprehensive.yml',
    description: 'Full TGE scenario with authentication',
    estimatedTime: '20 minutes'
  },
  quick: {
    file: 'artillery-tge-load-test.yml',
    description: 'Quick TGE load test',
    estimatedTime: '5 minutes'
  }
};

function runLoadTest(testType) {
  const config = TEST_CONFIGS[testType];
  
  if (!config) {
    console.error('❌ Invalid test type. Available types:', Object.keys(TEST_CONFIGS).join(', '));
    process.exit(1);
  }

  console.log('=== TGE Load Testing Script ===');
  console.log(`Test Type: ${testType}`);
  console.log(`Description: ${config.description}`);
  console.log(`Estimated Time: ${config.estimatedTime}`);
  console.log(`Config File: ${config.file}`);
  console.log('');

  // Check if artillery is installed
  try {
    exec('artillery --version', (error, stdout) => {
      if (error) {
        console.error('❌ Artillery is not installed. Please install it with:');
        console.error('npm install -g artillery');
        process.exit(1);
      }
      console.log(`✅ Artillery version: ${stdout.trim()}`);
      console.log('');
      
      startLoadTest(config);
    });
  } catch (error) {
    console.error('❌ Error checking Artillery installation:', error.message);
    process.exit(1);
  }
}

function startLoadTest(config) {
  const configFile = path.join(__dirname, '..', config.file);
  
  // Check if config file exists
  if (!fs.existsSync(configFile)) {
    console.error(`❌ Config file not found: ${configFile}`);
    process.exit(1);
  }

  console.log('🚀 Starting load test...');
  console.log(`📊 Results will be saved to artillery-report.html`);
  console.log('');

  // Set environment variables
  const env = {
    ...process.env,
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000'
  };

  console.log(`🌐 Target URL: ${env.API_BASE_URL}`);
  console.log('');

  // Run artillery command
  const artilleryCmd = `artillery run --output artillery-report.json ${configFile}`;
  
  const child = exec(artilleryCmd, { env }, (error, stdout, stderr) => {
    console.log('');
    
    if (error) {
      console.error('❌ Load test failed:', error.message);
      if (stderr) {
        console.error('Error output:', stderr);
      }
      process.exit(1);
    }

    console.log('✅ Load test completed successfully!');
    console.log('');
    console.log('📊 Generating HTML report...');
    
    // Generate HTML report
    exec('artillery report artillery-report.json', (reportError, reportStdout) => {
      if (reportError) {
        console.error('⚠️  Warning: Could not generate HTML report:', reportError.message);
        console.log('📄 Raw results available in artillery-report.json');
      } else {
        console.log('✅ HTML report generated: artillery-report.html');
      }
      
      console.log('');
      console.log('🎯 Load Test Summary:');
      console.log('- Check artillery-report.html for detailed metrics');
      console.log('- Look for P99 latency < 200ms as target');
      console.log('- Monitor error rates and response times');
      console.log('');
      
      // Try to extract key metrics
      try {
        const reportData = JSON.parse(fs.readFileSync('artillery-report.json', 'utf8'));
        const aggregate = reportData.aggregate;
        
        console.log('📈 Key Metrics:');
        console.log(`- Total Requests: ${aggregate.requests.completed}`);
        console.log(`- P95 Latency: ${aggregate.latency.p95}ms`);
        console.log(`- P99 Latency: ${aggregate.latency.p99}ms`);
        console.log(`- RPS: ${aggregate.rps.mean}`);
        console.log(`- Error Rate: ${((aggregate.errors.count / aggregate.requests.completed) * 100).toFixed(2)}%`);
        
        if (aggregate.latency.p99 < 200) {
          console.log('✅ P99 latency target (< 200ms) achieved!');
        } else {
          console.log('⚠️  P99 latency target (< 200ms) not achieved');
        }
        
      } catch (parseError) {
        console.log('📄 Could not parse report JSON for metrics');
      }
    });
  });

  // Stream output in real-time
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Load test interrupted by user');
    child.kill('SIGINT');
    process.exit(1);
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'basic';

if (args.includes('--help') || args.includes('-h')) {
  console.log('TGE Load Testing Script');
  console.log('');
  console.log('Usage: node scripts/run-tge-load-test.js [test-type]');
  console.log('');
  console.log('Available test types:');
  Object.entries(TEST_CONFIGS).forEach(([type, config]) => {
    console.log(`  ${type}: ${config.description} (${config.estimatedTime})`);
  });
  console.log('');
  console.log('Environment variables:');
  console.log('  API_BASE_URL: Target API URL (default: http://localhost:3000)');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/run-tge-load-test.js basic');
  console.log('  node scripts/run-tge-load-test.js comprehensive');
  console.log('  API_BASE_URL=http://localhost:4000 node scripts/run-tge-load-test.js quick');
  process.exit(0);
}

// Run the test
runLoadTest(testType);
