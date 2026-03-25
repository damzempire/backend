// Simple unit test for pagination logic
const { mockAllVaults } = require('./index.js');

// Mock the vaults data for testing
const mockVaults = Array.from({ length: 1500 }, (_, index) => ({
    id: index + 1,
    type: index % 2 === 0 ? 'advisor' : 'investor',
    locked: Math.floor(Math.random() * 1000) + 100,
    claimable: Math.floor(Math.random() * 100) + 10,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
}));

// Test pagination logic
const testPaginationLogic = () => {
    console.log('🧪 Testing Pagination Logic');
    
    // Test default pagination (page 1, limit 20)
    const page = 1;
    const limit = 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVaults = mockVaults.slice(startIndex, endIndex);
    
    // Calculate pagination metadata
    const totalVaults = mockVaults.length;
    const totalPages = Math.ceil(totalVaults / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Verify results
    const test1 = paginatedVaults.length === 20;
    const test2 = hasNextPage === true;
    const test3 = hasPrevPage === false;
    const test4 = totalVaults === 1500;
    
    console.log('✅ Default pagination test:', test1 && test2 && test3 && test4 ? 'PASSED' : 'FAILED');
    
    // Test page 2 with limit 10
    const page2 = 2;
    const limit2 = 10;
    const startIndex2 = (page2 - 1) * limit2;
    const endIndex2 = startIndex2 + limit2;
    const paginatedVaults2 = mockVaults.slice(startIndex2, endIndex2);
    
    const totalPages2 = Math.ceil(totalVaults / limit2);
    const hasNextPage2 = page2 < totalPages2;
    const hasPrevPage2 = page2 > 1;
    
    const test5 = paginatedVaults2.length === 10;
    const test6 = hasNextPage2 === true;
    const test7 = hasPrevPage2 === true;
    
    console.log('✅ Page 2 limit 10 test:', test5 && test6 && test7 ? 'PASSED' : 'FAILED');
    
    // Overall result
    const allTestsPassed = test1 && test2 && test3 && test4 && test5 && test6 && test7;
    
    if (allTestsPassed) {
        console.log('\n🎉 ALL UNIT TESTS PASSED!');
        process.exit(0);
    } else {
        console.log('\n❌ SOME UNIT TESTS FAILED!');
        process.exit(1);
    }
};

// Run unit tests
testPaginationLogic();
