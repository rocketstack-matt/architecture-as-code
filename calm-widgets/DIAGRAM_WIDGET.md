# Diagram Widget Usage Examples

The diagram widget generates visual representations of CALM architecture models.

## Basic Usage

```handlebars
{{diagram calmModel}}
```

## Filtered Diagram

Show only specific nodes and their direct relationships:

```handlebars
{{diagram calmModel nodes="auth-service,account-service"}}
```

## Example CALM Model

```json
{
  "nodes": [
    {
      "unique-id": "auth-service",
      "node-type": "service",
      "name": "Authentication Service",
      "description": "Handles user authentication and authorization"
    },
    {
      "unique-id": "bank-customer",
      "node-type": "actor", 
      "name": "Bank Customer",
      "description": "Digital banking customer"
    }
  ],
  "relationships": [
    {
      "unique-id": "customer-auth",
      "relationship-type": {
        "interacts": {
          "actor": "bank-customer",
          "nodes": ["auth-service"]
        }
      },
      "description": "Customer authenticates with system"
    }
  ]
}
```

## Supported Features

- **Node Types**: actor, system, service, database, and more
- **Relationships**: connects, interacts, composed-of, deployed-in
- **Flows**: data flows between components
- **Filtering**: Show only specified nodes and their direct connections
- **Visual Styling**: Different colors and shapes for different node types