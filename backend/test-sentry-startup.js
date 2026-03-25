require('dotenv').config();
const { spawn } = require('child_process');

console.log('Testing Sentry integration startup...');
const serverProcess = spawn('node', ['src/index.js']);

let started = false;

serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`STDOUT: ${output}`);
    if (output.includes('Server is running on port') || output.includes('Database connection established')) {
        started = true;
        console.log('✅ Server started successfully with Sentry integrated.');
        serverProcess.kill();
        process.exit(0);
    }
});

serverProcess.stderr.on('data', (data) => {
    console.error(`STDERR: ${data.toString()}`);
    if (data.toString().includes('Sentry') || data.toString().includes('Error')) {
        console.error('❌ Sentry startup error detected.');
        serverProcess.kill();
        process.exit(1);
    }
});

setTimeout(() => {
    if (!started) {
        console.log('⏳ Server took too long to start or no success message seen. Exiting.');
        serverProcess.kill();
        process.exit(1);
    }
}, 10000);
