# Parking Garage API Testing Interface

## Overview
This is an interactive API documentation and testing interface built with [Stoplight Elements](https://github.com/stoplightio/elements). It provides a user-friendly way to explore, test, and review the Parking Garage Management API.

## Features

- 📚 **Interactive API Documentation** - Browse all endpoints with detailed descriptions
- 🧪 **Try It Out** - Test API endpoints directly from the browser
- 🔍 **Request/Response Examples** - See example payloads and responses
- 🎯 **Quick Actions** - Common operations with one-click testing
- 📊 **OpenAPI Specification** - Full API specification in OpenAPI 3.0 format
- 🔌 **Server Configuration** - Easy switching between development/production servers

## Quick Start

### 1. Start the API Server
First, make sure your Parking Garage API is running:

```bash
npm start
# or
npm run dev
```

The API should be available at `http://localhost:3000`

### 2. Open the Testing Interface

Open the HTML file in your browser:

```bash
# From the project root
open docs/api-test.html

# Or use a local server
npx serve docs
# Then navigate to http://localhost:3000/api-test.html
```

### 3. Test Connection
Click the "Test Connection" button to verify the API server is reachable.

## Using the Interface

### Quick Actions
The interface provides several quick action buttons for common operations:

- **Initialize Garage** - Sets up a new garage with sample configuration
- **Check Status** - Verifies if the garage is operational
- **View Available Spots** - Lists all available parking spots
- **Simulate Check-in** - Tests the check-in flow without reserving a spot
- **Get Statistics** - Retrieves garage usage statistics

### Interactive Documentation

The main documentation area uses Stoplight Elements to provide:

1. **Endpoint List** - Browse all available API endpoints in the sidebar
2. **Request Details** - View required parameters, headers, and body schemas
3. **Try It** - Test endpoints directly with customizable parameters
4. **Code Samples** - Get code examples in various languages
5. **Response Schemas** - Understand the structure of API responses

### Testing Endpoints

To test an endpoint:

1. Navigate to the endpoint in the sidebar
2. Click the "Try It" tab
3. Fill in required parameters
4. Click "Send Request"
5. View the response in real-time

## API Endpoints Overview

### Garage Management (`/api/v1/garage`)
- Initialize garage configuration
- Update parking rates
- Get statistics and status
- Reset garage (dev only)

### Spot Management (`/api/v1/spots`)
- List spots with filtering
- Get spot details
- Update spot status/features
- View availability

### Check-in Operations (`/api/v1/checkin`)
- Check in vehicles
- Simulate check-ins
- Check availability
- Get check-in statistics

## OpenAPI Specification

The complete API specification is available in `docs/openapi.yaml`. This file:

- Defines all endpoints, parameters, and schemas
- Provides example requests and responses
- Documents error handling
- Includes authentication schemes (future implementation)

## Customization

### Changing the API Server

1. Enter the new server URL in the "API Server" field
2. Click "Update Server"
3. The connection status will update automatically

### Modifying the OpenAPI Spec

Edit `docs/openapi.yaml` to:
- Add new endpoints
- Update schemas
- Modify descriptions
- Add examples

Changes will be reflected after refreshing the page.

## Troubleshooting

### Connection Issues

If you see "Not Connected":
1. Verify the API server is running
2. Check the server URL is correct
3. Ensure no CORS issues (API should allow localhost)
4. Check browser console for errors

### CORS Errors

If you encounter CORS issues:
1. Ensure your API has proper CORS headers configured
2. The API should allow requests from `file://` or `localhost`
3. Consider using a local web server to serve the HTML file

### Missing Endpoints

If endpoints aren't showing:
1. Verify the OpenAPI spec is valid
2. Check the file path in the HTML is correct
3. Refresh the page after spec changes

## Development Tips

1. **Use Chrome DevTools** - Monitor network requests and responses
2. **Check Console** - JavaScript errors will appear here
3. **Validate OpenAPI** - Use tools like swagger-editor to validate the spec
4. **Test Incrementally** - Start with simple GET requests before complex POSTs

## Resources

- [Stoplight Elements Documentation](https://github.com/stoplightio/elements)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Parking Garage API README](../README.md)

## License

This testing interface is part of the Parking Garage Management System and follows the same MIT license.