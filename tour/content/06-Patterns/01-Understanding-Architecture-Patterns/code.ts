{
  "$schema": "https://calm.finos.org/draft/2025-03/meta/calm.json",
  "$id": "https://example.com/patterns/api-gateway",
  "title": "API Gateway Pattern",
  "type": "object",
  "properties": {
    "nodes": {
      "type": "array",
      "minItems": 3,
      "prefixItems": [
        {
          "$ref": "https://calm.finos.org/draft/2025-03/meta/core.json#/defs/node",
          "properties": {
            "description": {
              "const": "The API Gateway used to verify authorization and access to downstream system"
            },
            "node-type": {
              "const": "system"
            },
            "name": {
              "const": "API Gateway"
            },
            "unique-id": {
              "const": "api-gateway"
            }
          }
        },
        {
          "$ref": "https://calm.finos.org/draft/2025-03/meta/core.json#/defs/node",
          "properties": {
            "description": {
              "const": "The API Consumer making an authenticated and authorized request"
            },
            "node-type": {
              "const": "system"
            },
            "name": {
              "const": "API Consumer"
            },
            "unique-id": {
              "const": "api-consumer"
            }
          }
        },
        {
          "$ref": "https://calm.finos.org/draft/2025-03/meta/core.json#/defs/node",
          "properties": {
            "description": {
              "const": "The API Producer serving content"
            },
            "node-type": {
              "const": "system"
            },
            "name": {
              "const": "API Producer"
            },
            "unique-id": {
              "const": "api-producer"
            }
          }
        }
      ]
    },
    "relationships": {
      "type": "array",
      "minItems": 2,
      "prefixItems": [
        {
          "$ref": "https://calm.finos.org/draft/2025-03/meta/core.json#/defs/relationship",
          "properties": {
            "unique-id": {
              "const": "api-consumer-api-gateway"
            },
            "description": {
                "const": "Issue request"
            },
            "relationship-type": {
              "const": {
                "connects": {
                  "source": {
                    "node": "api-consumer"
                  },
                  "destination": {
                    "node": "api-gateway"
                  }
                }
              }
            },
            "protocol": {
              "const": "HTTPS"
            },
            "authentication": {
              "const": "OAuth2"
            }
          }
        },
        {
          "$ref": "https://calm.finos.org/draft/2025-03/meta/core.json#/defs/relationship",
          "properties": {
            "unique-id": {
              "const": "api-gateway-api-producer"
            },
            "description": {
                "const": "Forward request"
            },
            "relationship-type": {
              "const": {
                "connects": {
                  "source": {
                    "node": "api-gateway"
                  },
                  "destination": {
                    "node": "api-producer"
                  }
                }
              }
            },
            "protocol": {
              "const": "HTTPS"
            }
          }
        }
      ]
    }
  },
  "required": [
    "nodes",
    "relationships"
  ]
}