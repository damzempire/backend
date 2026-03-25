// Deployment script for Vesting Vault Backend
const { exec } = require('child_process');

console.log('🚀 Starting deployment process...');

// Install dependencies
exec('npm install', (error, stdout, stderr) => {
    if (error) {
        console.error('❌ npm install failed:', error);
        return;
    }
    console.log('✅ Dependencies installed');
    
    // Start: server
    console.log('🌟 Starting Vesting Vault API...');
    console.log('📍 Portfolio endpoint: http://localhost:3000/api/user/:address/portfolio');
    console.log('📍 Vaults endpoint: http://localhost:3000/api/vaults?page=1&limit=20');
    console.log('🧪 Test with: node test-pagination.js');
    
    const server = exec('node index.js', (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Server start failed:', error);
            return;
        }
        console.log('✅ Server is running!');
        
        // Handle server output
        server.stdout.on('data', (data) => {
            console.log(data.toString());
        });
        
        server.stderr.on('data', (data) => {
            console.error('Error:', data.toString());
        });
    });
});
