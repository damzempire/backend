const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Verinode Vesting Vault API',
      version: '1.0.0',
      description: 'API documentation for the Verinode Vesting Vault system with cliff support for top-ups',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.verinode.io',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        XUserAddress: {
          type: 'apiKey',
          in: 'header',
          name: 'x-user-address',
        },
      },
    },
  },
  apis: ['./src/**/*.js', './src/**/*.ts', './src/swagger/swaggerConfig.js'], // Files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = specs;