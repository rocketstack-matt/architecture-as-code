# Day 12: Add Multiple Interface Types

## Overview
Model heterogeneous integration patterns by adding different interface types to your architecture.

## Objective and Rationale
- **Objective:** Add different interface types (REST API, message queue, database connection) to nodes in your architecture
- **Rationale:** Real systems use multiple integration protocols. Learn to model HTTP APIs, async messaging, database connections, and other interface types. This makes architectures actionable for code generation and integration testing.

## Requirements

### 1. Understand Interface Types

CALM supports multiple interface patterns:
- **host-port-interface:** Traditional host:port (APIs, databases)
- **url-interface:** Full URLs (REST APIs, webhooks)
- **hostname-interface:** Just hostname (DNS, service discovery)
- **path-interface:** File paths (shared filesystems)
- **oauth2-audience-interface:** OAuth2 configuration

All interfaces share:
- **unique-id:** Identifier
- **Protocol** (in the relationship that uses it): HTTP, HTTPS, JDBC, AMQP, etc.

### 2. Add a REST API Interface

Update the `api-gateway` node in `architectures/ecommerce-platform.json`.

**Prompt:**
```text
Update the api-gateway node in architectures/ecommerce-platform.json to add an interfaces array with a url-interface:

- unique-id: "gateway-rest-api"
- url: "https://api.example.com/v1"

If interfaces already exist, add this as an additional interface.
```

### 3. Add a Database JDBC Interface

Update the `order-database` node.

**Prompt:**
```text
Update the order-database node in architectures/ecommerce-platform.json to add a host-port-interface:

- unique-id: "postgres-jdbc"
- host: "db-cluster-1.internal.example.com"
- port: 5432

Reference this interface in the relationship that connects to this database.
Update the relationship's connects section to include:
- destination-node: "order-database"
- interfaces: ["postgres-jdbc"]
```

### 4. Add a Message Queue Interface

Add a new message broker node.

**Prompt:**
```text
Add a new node to architectures/ecommerce-platform.json:

- unique-id: "message-broker"
- node-type: "system"
- name: "Message Queue"
- description: "RabbitMQ message broker for async processing"
- interfaces array:
  - unique-id: "amqp-interface"
  - host: "rabbitmq.internal.example.com"
  - port: 5672

Add a relationship connecting order-service to message-broker:
- unique-id: "order-to-queue"
- description: "Order service publishes events to message queue"
- relationship-type: connects
  - source-node: "order-service"
  - destination-node: "message-broker"
  - interfaces: ["amqp-interface"]
  - protocol: "AMQP"
```

### 5. Add an OAuth2 Interface

Add authentication configuration to the api-gateway.

**Prompt:**
```text
Add an oauth2-audience-interface to the api-gateway node in architectures/ecommerce-platform.json:

- unique-id: "oauth2-config"
- audiences: ["https://api.example.com", "https://mobile.example.com"]

This documents which OAuth2 audiences the gateway accepts.
```

### 6. Validate Multiple Interface Types

```bash
calm validate -a architectures/ecommerce-platform.json
```

Should pass! ✅

### 7. Visualize the Multi-Protocol Architecture

**Steps:**
1. Save `architectures/ecommerce-platform.json`
2. Open preview (Ctrl+Shift+C)
3. Relationships should show different protocols (HTTPS, JDBC, AMQP)
4. **Take a screenshot** showing the heterogeneous integration patterns

### 8. Create an Interface Catalog

**File:** `docs/interface-catalog.md`

**Content:**
```markdown
# E-Commerce Platform Interface Catalog

## REST APIs

### API Gateway - Main API
- **Interface ID:** gateway-rest-api
- **Type:** url-interface
- **URL:** https://api.example.com/v1
- **Protocol:** HTTPS
- **Purpose:** Primary public-facing API for web and mobile clients

## Database Connections

### Order Database - PostgreSQL
- **Interface ID:** postgres-jdbc
- **Type:** host-port-interface
- **Host:** db-cluster-1.internal.example.com
- **Port:** 5432
- **Protocol:** JDBC
- **Purpose:** Persistent storage for order data

## Message Queues

### Message Broker - RabbitMQ
- **Interface ID:** amqp-interface
- **Type:** host-port-interface
- **Host:** rabbitmq.internal.example.com
- **Port:** 5672
- **Protocol:** AMQP
- **Purpose:** Asynchronous event processing and service decoupling

## Authentication

### API Gateway - OAuth2
- **Interface ID:** oauth2-config
- **Type:** oauth2-audience-interface
- **Audiences:** 
  - https://api.example.com
  - https://mobile.example.com
- **Purpose:** OAuth2 token validation configuration

## Integration Patterns Summary

| Pattern | Count | Use Cases |
|---------|-------|-----------|
| REST API (HTTPS) | 5+ | Client-server communication |
| Database (JDBC) | 2+ | Data persistence |
| Message Queue (AMQP) | 1 | Async processing, event-driven |
| OAuth2 | 1 | Authentication & authorization |

## Benefits

1. **Multi-Protocol:** Models real-world heterogeneous systems
2. **Precise Connections:** Relationships reference specific interfaces
3. **Code Generation:** Enough detail to generate client code
4. **Testing:** Integration tests can use interface details
```

### 9. Generate Documentation

```bash
calm docify --architecture architectures/ecommerce-platform.json --output docs/generated/ecommerce-interfaces
```

Open `docs/generated/ecommerce-interfaces/index.html` to see interface details in the generated docs.

### 10. Update Your README

Check off Day 12 in your README progress checklist and note that the architecture now documents REST, JDBC, AMQP, and OAuth2 interfaces. Link to `docs/interface-catalog.md` or the generated docs so teammates know where to review the catalog.

### 11. Commit Your Work

```bash
git add architectures/ecommerce-platform.json docs/interface-catalog.md docs/generated README.md
git commit -m "Day 12: Add multiple interface types (REST, JDBC, AMQP, OAuth2)"
git tag day-12
```

## Deliverables

✅ **Required:**
- `architectures/ecommerce-platform.json` - With 4+ different interface types
- `docs/interface-catalog.md` - Interface documentation
- `docs/generated/ecommerce-interfaces/` - Generated documentation
- Screenshot showing multi-protocol visualization
- Updated `README.md` - Day 12 marked complete

✅ **Validation:**
```bash
# Verify multiple interface types
grep -q 'url-interface' architectures/ecommerce-platform.json
grep -q 'host-port-interface' architectures/ecommerce-platform.json
grep -q 'oauth2-audience-interface' architectures/ecommerce-platform.json

# Verify message broker
grep -q 'message-broker' architectures/ecommerce-platform.json
grep -q 'AMQP' architectures/ecommerce-platform.json

# Validate
calm validate -a architectures/ecommerce-platform.json

# Check tag
git tag | grep -q "day-12"
```

## Resources
- [CALM Interface Schema](https://github.com/finos/architecture-as-code/blob/main/calm/draft/2025-03/meta/interface.json)
- [OAuth2 Audiences](https://datatracker.ietf.org/doc/html/rfc8693#section-4.3)

## Tips
- Relationships reference interfaces via the `interfaces` array in `connects`
- Multiple nodes can share the same interface type (e.g., all DBs use host-port)
- Interface details enable code generation and testing automation
- Use meaningful unique-ids that indicate purpose
- Document protocol choices in your interface catalog

## Next Steps
Tomorrow (Day 13) you'll link your architecture to Architecture Decision Records (ADRs)!
