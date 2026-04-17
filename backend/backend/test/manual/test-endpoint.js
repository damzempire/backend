// Test script for portfolio endpoint
const http = require('http');

const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

const options = {
    hostname: '127.0.0.1',
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
    });
});

req.on('error', (e) => {
    console.error('❌ Request Error:', e.message);
});

req.end();