const fs = require('fs');
const path = require('path');

beforeAll(() => {
    const testDbDir = path.join(__dirname, '../data');
    if (!fs.existsSync(testDbDir)) {
        fs.mkdirSync(testDbDir, { recursive: true });
    }
});

afterAll(() => {
    const testDbDir = path.join(__dirname, '../data');
    if (fs.existsSync(testDbDir)) {
        const files = fs.readdirSync(testDbDir);
        files.forEach(file => {
            fs.unlinkSync(path.join(testDbDir, file));
        });
    }
});
