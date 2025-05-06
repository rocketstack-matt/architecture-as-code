{
  "$schema": "https://calm.finos.org/draft/2025-03/meta/calm.json",
  "nodes": [
    {
      "unique-id": "api-service",
      "node-type": "service",
      "name": "API Service",
      "description": "Provides REST API endpoints"
      // Add an interfaces array with a host-port interface
      // Include unique-id, interface-type, host, and port
    },
    {
      "unique-id": "frontend-app",
      "node-type": "service",
      "name": "Frontend Application",
      "description": "Web frontend that uses the API"
    }
  ],
  "relationships": [
    {
      "unique-id": "frontend-to-api",
      "description": "Frontend connects to the API",
      "relationship-type": {
        "connects": {
          "source": {
            "node": "frontend-app"
          },
          "destination": {
            "node": "api-service"
            // Update this to reference the specific interface
          }
        }
      },
      "protocol": "HTTPS"
    }
  ]
}