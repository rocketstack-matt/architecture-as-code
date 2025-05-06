{
  "$schema": "https://calm.finos.org/draft/2025-03/meta/calm.json",
  "nodes": [
    {
      "unique-id": "api-service",
      "node-type": "service",
      "name": "API Service",
      "description": "Provides REST API endpoints",
      "run-as": "systemId"
    },
    {
      "unique-id": "user-database",
      "node-type": "database",
      "name": "User Database",
      "description": "Stores user information",
      "data-classification": "PII"
    }
  ],
  "relationships": [
    // Add a connects relationship between the API service and the database
    // Include unique-id, description, relationship-type, protocol, and authentication
  ]
}