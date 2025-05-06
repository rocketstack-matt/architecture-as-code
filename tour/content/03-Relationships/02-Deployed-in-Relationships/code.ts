{
  "$schema": "https://calm.finos.org/draft/2025-03/meta/calm.json",
  "nodes": [
    {
      "unique-id": "api-service",
      "node-type": "service",
      "name": "API Service",
      "description": "Provides REST API endpoints"
    },
    {
      "unique-id": "auth-service",
      "node-type": "service",
      "name": "Authentication Service",
      "description": "Handles user authentication"
    },
    {
      "unique-id": "internal-network",
      "node-type": "network",
      "name": "Internal Network",
      "description": "Corporate internal network"
    }
  ],
  "relationships": [
    // Add a deployed-in relationship showing that both services
    // are deployed in the internal network
    // Include unique-id, description, and relationship-type
  ]
}