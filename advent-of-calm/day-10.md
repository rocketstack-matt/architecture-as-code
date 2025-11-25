# Day 10: Link to an ADR

## Overview
Connect architectural decisions to your CALM architecture by linking Architecture Decision Records.

## Objective and Rationale
- **Objective:** Create ADR documents and link them to your architecture using the `adrs` property
- **Rationale:** Architecture Decision Records capture the "why" behind design choices. Linking them to CALM architectures creates traceability from decisions to implementation, essential for onboarding, audits, and understanding system evolution.

## Requirements

### 1. Understand ADRs in CALM

The `adrs` property is a top-level array in CALM architectures containing URLs to decision records:
- Can reference local markdown files
- Can reference remote documentation
- Links decisions to technical implementation

### 2. Create Your ADR Directory

```bash
mkdir -p docs/adr
```

### 3. Create Your First ADR

Use the popular ADR format (title, status, context, decision, consequences).

**File:** `docs/adr/0001-use-message-queue-for-async-processing.md`

**Content:**
```markdown
# 1. Use Message Queue for Asynchronous Order Processing

Date: 2024-12-15

## Status
Accepted

## Context
Our e-commerce platform needs to handle order processing asynchronously to:
- Improve user experience with fast order confirmation
- Decouple order capture from payment processing
- Handle traffic spikes without overloading payment services
- Enable retry logic for failed payment attempts

## Decision
We will introduce a RabbitMQ message broker between the Order Service and Payment Service.

**Technical Details:**
- Protocol: AMQP
- Broker: RabbitMQ 3.12+
- Message format: JSON
- Durability: Persistent messages with acknowledgments

## Consequences

### Positive
- **Resilience:** Payment service failures don't block order submission
- **Scalability:** Can scale payment processing independently
- **User Experience:** Immediate order confirmation
- **Retries:** Failed payments can be retried automatically

### Negative
- **Complexity:** Adds another system component to manage
- **Eventual Consistency:** Order status updates are asynchronous
- **Operational Overhead:** Requires monitoring, backlog management

### Mitigations
- Implement comprehensive message monitoring
- Add dead-letter queues for failed messages
- Provide customer-facing order status tracking
```

### 4. Create a Second ADR

**File:** `docs/adr/0002-use-oauth2-for-api-authentication.md`

**Content:**
```markdown
# 2. Use OAuth2 for API Authentication

Date: 2024-12-15

## Status
Accepted

## Context
The API Gateway requires a secure, standardized authentication mechanism for:
- Web application clients
- Mobile application clients
- Third-party API integrations

## Decision
Implement OAuth2 with JWT tokens for all API authentication.

**Technical Details:**
- Standard: OAuth 2.0 (RFC 6749)
- Token format: JWT (RFC 7519)
- Grant types: Authorization Code, Client Credentials
- Token expiry: 1 hour access tokens, 30 day refresh tokens
- Audiences: api.example.com, mobile.example.com

## Consequences

### Positive
- **Industry Standard:** Well-understood, widely supported
- **Flexibility:** Supports multiple client types
- **Stateless:** JWTs contain claims, no server-side session storage
- **Ecosystem:** Compatible with existing OAuth2 libraries

### Negative
- **Token Management:** Clients must handle refresh logic
- **Token Size:** JWTs larger than session cookies
- **Revocation:** Immediate revocation requires additional infrastructure

### Mitigations
- Short-lived access tokens minimize revocation issues
- Implement token refresh flows
- Add token introspection endpoint for validation
```

### 5. Link ADRs to Your Architecture

**Prompt:**
```text
Add an adrs array at the top level of architectures/ecommerce-platform.json (after the $schema and before metadata).

Add these URLs:
- "docs/adr/0001-use-message-queue-for-async-processing.md"
- "docs/adr/0002-use-oauth2-for-api-authentication.md"

These are relative paths from the repository root.
```

### 6. Validate with ADRs

```bash
calm validate -a architectures/ecommerce-platform.json
```

Should pass! ✅

### 7. Create an ADR Index

**File:** `docs/adr/README.md`

**Content:**
```markdown
# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the e-commerce platform.

## Format
We follow the format described in [Michael Nygard's ADR template](https://github.com/joelparkerhenderson/architecture_decision_record/blob/main/templates/decision-record-template-by-michael-nygard/index.md):

- Title
- Status (Proposed, Accepted, Deprecated, Superseded)
- Context
- Decision
- Consequences

## Index

### Active

| ADR | Title | Date |
|-----|-------|------|
| [0001](0001-use-message-queue-for-async-processing.md) | Use Message Queue for Asynchronous Order Processing | 2024-12-15 |
| [0002](0002-use-oauth2-for-api-authentication.md) | Use OAuth2 for API Authentication | 2024-12-15 |

### Superseded
None yet.

## Creating New ADRs

Use the numbering sequence: 0003, 0004, etc.

Filename format: `NNNN-short-title-with-hyphens.md`

Link the ADR in `architectures/ecommerce-platform.json` in the `adrs` array.

## Benefits

1. **Traceability:** Link decisions to architecture implementation
2. **Onboarding:** New team members understand "why" not just "what"
3. **Auditing:** Decision history for compliance and reviews
4. **Evolution:** Track how architecture decisions change over time
```

### 8. Create a Decision Log Visualization

**File:** `docs/decision-timeline.md`

**Content:**
```markdown
# Architecture Decision Timeline

## December 2024

### Week 3
- **2024-12-15:** [ADR-0001] Adopted message queue for async processing
  - Impact: Added RabbitMQ node to architecture
  - Relationships: order-service → message-broker → payment-service
  
- **2024-12-15:** [ADR-0002] Adopted OAuth2 for authentication
  - Impact: Added oauth2-audience-interface to api-gateway
  - Security control: Links to internal OAuth2 policy

## Decision Categories

### Integration Patterns (1 ADR)
- Asynchronous messaging via AMQP

### Security & Authentication (1 ADR)
- OAuth2 with JWT tokens

## Future Decisions Needed

- [ ] Database replication strategy
- [ ] Caching layer (Redis vs. Memcached)
- [ ] Monitoring and observability platform
- [ ] Deployment strategy (blue/green vs. canary)
```

### 9. Update Your README

Update your README to reflect that Day 10 is complete, mention that ADRs are now linked to the architecture, and add links to the specific ADR files so reviewers can jump directly to the decisions.

### 10. Commit Your Work

```bash
git add architectures/ecommerce-platform.json docs/adr docs/decision-timeline.md README.md
git commit -m "Day 10: Link ADRs to architecture for decision traceability"
git tag day-10
```

## Deliverables

✅ **Required:**
- `architectures/ecommerce-platform.json` - With adrs array
- `docs/adr/0001-use-message-queue-for-async-processing.md`
- `docs/adr/0002-use-oauth2-for-api-authentication.md`
- `docs/adr/README.md` - ADR index
- `docs/decision-timeline.md` - Decision visualization
- Updated `README.md` - Day 10 marked complete

✅ **Validation:**
```bash
# Verify ADRs array exists
grep -q '"adrs"' architectures/ecommerce-platform.json

# Verify ADR files exist
test -f docs/adr/0001-use-message-queue-for-async-processing.md
test -f docs/adr/0002-use-oauth2-for-api-authentication.md
test -f docs/adr/README.md

# Check ADR links in architecture
grep -A 2 '"adrs"' architectures/ecommerce-platform.json | grep -q '0001'
grep -A 2 '"adrs"' architectures/ecommerce-platform.json | grep -q '0002'

# Validate
calm validate -a architectures/ecommerce-platform.json

# Check tag
git tag | grep -q "day-10"
```

## Resources

- [CALM ADR Example](https://github.com/finos/architecture-as-code/tree/main/calm/release/1.0-rc1/prototype/adr-example.json)
- [ADR Templates](https://github.com/joelparkerhenderson/architecture_decision_record)
- [When to Write ADRs](https://adr.github.io/)

## Tips

- Write ADRs when making significant architectural decisions
- Include both positive and negative consequences
- Link ADRs from CALM to create bidirectional traceability
- Use consistent numbering (0001, 0002, etc.)
- Keep ADRs immutable - supersede old decisions rather than editing
- ADRs can be markdown, PDF, or links to wiki pages

## Next Steps
Tomorrow (Day 11) you'll generate documentation with the docify command!
