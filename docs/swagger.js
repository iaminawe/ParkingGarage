/**
 * Swagger UI Configuration and Setup
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
        description: 'RESTful API for managing parking garage operations'
      },
      servers: [
        {
          url: 'http://localhost:3000/api',
          description: 'Development server'
        }
      ],
      paths: {
        '/health': {
          get: {
            tags: ['System'],
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
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
    tryItOutEnabled: true
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
`;

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
        customSiteTitle: 'Parking Garage API Documentation',
        swaggerOptions: {
          ...swaggerOptions.swaggerOptions,
          validatorUrl: null, // Disable online validator
        }
      })
    };
  } catch (error) {
    console.error('Failed to create Swagger middleware:', error);
    
    // Return error page middleware
    return {
      serve: swaggerUi.serve,
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
      }
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
  downloadOpenApiSpec
};