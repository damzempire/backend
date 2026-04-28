// jest.setup.js
require('dotenv').config({ path: '.env.test' });

// Set test timeouts
jest.setTimeout(60000);

// Setup OpenAPI validation for tests
try {
  const jestOpenAPI = require('jest-openapi').default;
  const swaggerSpec = require('./src/swagger/options');
  jestOpenAPI(swaggerSpec);
} catch (error) {
  console.warn('OpenAPI validation setup failed (optional):', error.message);
}
