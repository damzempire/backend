const jestOpenAPI = require('jest-openapi').default;
const swaggerSpec = require('../src/swagger/options');

jestOpenAPI(swaggerSpec);
