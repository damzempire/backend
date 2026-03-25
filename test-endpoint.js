// Test script for portfolio endpoint
const http = require('http');

const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/user/${testAddress}/portfolio`,
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};

const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('✅ Response Status:', res.statusCode);
        console.log('✅ Response Data:');
        console.log(JSON.stringify(JSON.parse(data), null, 2));
        
        // Verify acceptance criteria
        const response = JSON.parse(data);
        if (response.total_locked === 100 && response.total_claimable === 20) {
            console.log('🎉 SUCCESS: Acceptance criteria met!');
        } else {
            console.log('❌ FAILED: Acceptance criteria not met');
        }
    });
});

req.on('error', (e) => {
    console.error('❌ Request Error:', e.message);
});

req.end();
