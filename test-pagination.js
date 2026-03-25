// Test script for pagination endpoint
const http = require('http');

// Test default pagination (page 1, limit 20)
const testDefaultPagination = () => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/vaults',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('✅ Default Pagination Test:');
                    console.log('Page:', response.pagination.current_page);
                    console.log('Limit:', response.pagination.per_page);
                    console.log('Total Vaults:', response.pagination.total_vaults);
                    console.log('Vaults returned:', response.vaults.length);
                    console.log('Has next page:', response.pagination.has_next_page);
                    
                    // Verify acceptance criteria
                    if (response.pagination.current_page === 1 && 
                        response.pagination.per_page === 20 &&
                        response.vaults.length <= 20) {
                        console.log('🎉 SUCCESS: Default pagination works!');
                        resolve(true);
                    } else {
                        console.log('❌ FAILED: Default pagination test failed');
                        resolve(false);
                    }
                } catch (error) {
                    console.log('❌ ERROR parsing response:', error.message);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ ERROR making request:', error.message);
            resolve(false);
        });
        
        req.end();
    });
};

// Test page 2 with limit 10
const testPage2Limit10 = () => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/vaults?page=2&limit=10',
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    console.log('\n✅ Page 2 Limit 10 Test:');
                    console.log('Page:', response.pagination.current_page);
                    console.log('Limit:', response.pagination.per_page);
                    console.log('Vaults returned:', response.vaults.length);
                    console.log('Has prev page:', response.pagination.has_prev_page);
                    
                    // Verify acceptance criteria
                    if (response.pagination.current_page === 2 && 
                        response.pagination.per_page === 10 &&
                        response.vaults.length <= 10) {
                        console.log('🎉 SUCCESS: Custom pagination works!');
                        resolve(true);
                    } else {
                        console.log('❌ FAILED: Custom pagination test failed');
                        resolve(false);
                    }
                } catch (error) {
                    console.log('❌ ERROR parsing response:', error.message);
                    resolve(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log('❌ ERROR making request:', error.message);
            resolve(false);
        });
        
        req.end();
    });
};

// Run tests and exit with proper code
const runTests = async () => {
    console.log('🧪 Testing Pagination for Issue #18\n');
    
    try {
        const test1 = await testDefaultPagination();
        const test2 = await testPage2Limit10();
        
        if (test1 && test2) {
            console.log('\n🎉 ALL TESTS PASSED!');
            process.exit(0);
        } else {
            console.log('\n❌ SOME TESTS FAILED!');
            process.exit(1);
        }
    } catch (error) {
        console.log('\n❌ TEST ERROR:', error.message);
        process.exit(1);
    }
};

// Run tests
runTests();
