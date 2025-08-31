/**
 * Swagger UI Configuration and Setup
 * 
 * Integrates OpenAPI specification with Swagger UI for interactive API documentation.
 */

const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

/**
 * Load OpenAPI specification from YAML file
 */
function loadOpenApiSpec() {
  try {
    const specPath = path.join(__dirname, 'openapi.yaml');
    
    if (!fs.existsSync(specPath)) {
      throw new Error(`OpenAPI specification not found at ${specPath}`);
    }
    
    return YAML.load(specPath);
  } catch (error) {
    console.error('Failed to load OpenAPI specification:', error.message);
    
    // Return minimal spec as fallback
    return {
      openapi: '3.0.0',
      info: {
        title: 'Parking Garage API',
        version: '1.0.0',
        description: 'OpenAPI specification failed to load'
      },
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            responses: {
              '200': {
                description: 'Server is healthy'
              }
            }
          }
        }
      }
    };
  }
}

/**
 * Swagger UI configuration options
 */
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    url: '/api-docs/swagger.json',
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true,
    requestInterceptor: (request) => {
      // Add custom headers or modify requests if needed
      request.headers['X-API-Documentation'] = 'Swagger-UI';
      return request;
    },
    responseInterceptor: (response) => {
      // Log response for debugging if needed
      if (process.env.NODE_ENV === 'development') {
        console.log('Swagger UI API Response:', {
          status: response.status,
          url: response.url,
          duration: response.duration
        });
      }
      return response;
    }
  }
};

/**
 * Custom CSS for Swagger UI styling
 */
const customCss = `
  .swagger-ui .topbar { display: none }
  .swagger-ui .info { margin: 50px 0 }
  .swagger-ui .info .title {
    color: #2c3e50;
    font-size: 36px;
  }
  .swagger-ui .info .description {
    color: #7f8c8d;
    font-size: 16px;
    line-height: 1.6;
  }
  .swagger-ui .scheme-container {
    background: #ecf0f1;
    padding: 15px;
    border-radius: 5px;
    margin: 20px 0;
  }
  .swagger-ui .opblock.opblock-post {
    border-color: #27ae60;
  }
  .swagger-ui .opblock.opblock-post .opblock-summary {
    border-color: #27ae60;
  }
  .swagger-ui .opblock.opblock-get {
    border-color: #3498db;
  }
  .swagger-ui .opblock.opblock-get .opblock-summary {
    border-color: #3498db;
  }
  .swagger-ui .opblock.opblock-patch {
    border-color: #f39c12;
  }
  .swagger-ui .opblock.opblock-patch .opblock-summary {
    border-color: #f39c12;
  }
  .swagger-ui .opblock.opblock-delete {
    border-color: #e74c3c;
  }
  .swagger-ui .opblock.opblock-delete .opblock-summary {
    border-color: #e74c3c;
  }
  .swagger-ui .btn.try-out__btn {
    background: #2c3e50;
    color: white;
    border-color: #2c3e50;
  }
  .swagger-ui .btn.try-out__btn:hover {
    background: #34495e;
    border-color: #34495e;
  }
  .swagger-ui .btn.execute {
    background: #27ae60;
    color: white;
    border-color: #27ae60;
  }
  .swagger-ui .btn.execute:hover {
    background: #229954;
    border-color: #229954;
  }
  .swagger-ui .responses-inner h4,
  .swagger-ui .responses-inner h5 {
    color: #2c3e50;
  }
  .swagger-ui .response-col_status {
    font-weight: bold;
  }
  .swagger-ui .opblock-tag {
    color: #2c3e50 !important;
    font-size: 24px !important;
    font-weight: bold !important;
    border-bottom: 2px solid #ecf0f1 !important;
    padding-bottom: 10px !important;
    margin: 30px 0 20px 0 !important;
  }
  .swagger-ui .parameter__name {
    font-weight: bold;
    color: #2c3e50;
  }
  .swagger-ui .parameter__type {
    color: #7f8c8d;
    font-weight: normal;
  }
  .swagger-ui .model-title {
    color: #2c3e50 !important;
    font-size: 20px !important;
  }
  .swagger-ui .prop-type {
    color: #8e44ad;
    font-weight: bold;
  }
  .swagger-ui .prop-format {
    color: #7f8c8d;
  }
  .swagger-ui .servers {
    background: #f8f9fa;
    border: 1px solid #dee2e6;
    border-radius: 5px;
    padding: 15px;
    margin: 20px 0;
  }
  .swagger-ui .servers-title {
    color: #2c3e50;
    font-weight: bold;
    margin-bottom: 10px;
  }
  .swagger-ui select {
    border: 1px solid #bdc3c7;
    border-radius: 3px;
    padding: 5px 10px;
  }
  .swagger-ui .highlight-code {
    background: #f8f9fa !important;
  }
  .swagger-ui .curl-command {
    background: #2c3e50;
    color: #ecf0f1;
    padding: 15px;
    border-radius: 5px;
    font-family: 'Monaco', 'Consolas', monospace;
    font-size: 12px;
    overflow-x: auto;
  }
`;

/**
 * Custom Swagger UI site title and favicon
 */
const customSiteTitle = 'Parking Garage API Documentation';

/**
 * Enhanced OpenAPI spec with additional metadata
 */
function enhanceOpenApiSpec(spec) {
  // Add server information based on environment
  const currentHost = process.env.HOST || 'localhost';
  const currentPort = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';
  
  spec.servers = [
    {
      url: isProduction 
        ? `https://${currentHost}/api`
        : `http://${currentHost}:${currentPort}/api`,
      description: isProduction ? 'Production server' : 'Development server'
    }
  ];

  // Add security schemes if needed
  spec.components = spec.components || {};
  spec.components.securitySchemes = {
    ApiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
      description: 'API key for authenticated requests (future implementation)'
    },
    BearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'JWT token for authenticated requests (future implementation)'
    }
  };

  // Add additional tags with descriptions
  const enhancedTags = [
    {
      name: 'System',
      description: 'System health monitoring and status check endpoints'
    },
    {
      name: 'Garage Management',
      description: 'Endpoints for initializing and configuring the parking garage'
    },
    {
      name: 'Spot Management',
      description: 'Manage and query parking spots across floors and bays'
    },
    {
      name: 'Vehicle Operations',
      description: 'Core parking operations: check-in, check-out, and simulation'
    },
    {
      name: 'Vehicle Management',
      description: 'Track and manage currently parked vehicles'
    },
    {
      name: 'Analytics',
      description: 'Business intelligence and reporting endpoints'
    }
  ];

  spec.tags = enhancedTags;

  // Add external documentation links
  spec.externalDocs = {
    description: 'Find more info about Parking Garage API',
    url: 'https://github.com/parking-garage/api-docs'
  };

  return spec;
}

/**
 * Create Swagger UI middleware
 */
function createSwaggerMiddleware() {
  try {
    const spec = loadOpenApiSpec();
    const enhancedSpec = enhanceOpenApiSpec(spec);
    
    return {
      serve: swaggerUi.serve,
      setup: swaggerUi.setup(enhancedSpec, {
        ...swaggerOptions,
        customCss: customCss,
        customSiteTitle: customSiteTitle,
        customfavIcon: '/favicon.ico',
        swaggerOptions: {
          ...swaggerOptions.swaggerOptions,
          validatorUrl: null, // Disable online validator
          url: null, // Use spec directly instead of URL
        }
      }),
      spec: enhancedSpec
    };
  } catch (error) {
    console.error('Failed to create Swagger middleware:', error);
    
    // Return error page middleware
    return {
      serve: (req, res, next) => next(),
      setup: (req, res) => {
        res.status(500).send(`
          <html>
            <head><title>API Documentation Error</title></head>
            <body style="font-family: Arial, sans-serif; margin: 40px;">
              <h1>API Documentation Unavailable</h1>
              <p>There was an error loading the API documentation.</p>
              <p><strong>Error:</strong> ${error.message}</p>
              <p>Please check the OpenAPI specification file and try again.</p>
              <a href="/">← Back to API</a>
            </body>
          </html>
        `);
      },
      spec: null
    };
  }
}

/**
 * Express route handler for raw OpenAPI spec (JSON)
 */
function getOpenApiSpec(req, res) {
  try {
    const spec = loadOpenApiSpec();
    const enhancedSpec = enhanceOpenApiSpec(spec);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json(enhancedSpec);
  } catch (error) {
    console.error('Error serving OpenAPI spec:', error);
    res.status(500).json({
      error: 'Failed to load OpenAPI specification',
      message: error.message
    });
  }
}

/**
 * Express route handler for OpenAPI spec download
 */
function downloadOpenApiSpec(req, res) {
  try {
    const specPath = path.join(__dirname, 'openapi.yaml');
    
    if (!fs.existsSync(specPath)) {
      return res.status(404).json({
        error: 'OpenAPI specification file not found'
      });
    }
    
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename="parking-garage-api.yaml"');
    res.sendFile(specPath);
  } catch (error) {
    console.error('Error serving OpenAPI spec download:', error);
    res.status(500).json({
      error: 'Failed to download OpenAPI specification',
      message: error.message
    });
  }
}

module.exports = {
  createSwaggerMiddleware,
  getOpenApiSpec,
  downloadOpenApiSpec,
  loadOpenApiSpec,
  swaggerOptions,
  customCss
};