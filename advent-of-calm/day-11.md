# Day 11: Model a Business Flow

## Overview
Map business processes to technical architecture using flows, connecting business intent to implementation.

## Objective and Rationale
- **Objective:** Create a flow that traces an order processing business process across your e-commerce architecture
- **Rationale:** Flows bridge business and technology by showing how business processes map to technical components. Essential for business-IT alignment, impact analysis, and understanding system behavior.

## Requirements

### 1. Understand Flows

Flows consist of:
- **unique-id:** Identifier for the flow
- **name:** Business process name
- **description:** What the flow represents
- **transitions:** Ordered steps referencing relationships
  - `relationship-unique-id`: Which connection is used
  - `sequence-number`: Order in the flow (1, 2, 3...)
  - `summary`: What happens in this step
  - `direction`: `source-to-destination` or `destination-to-source`

### 2. Map Your E-Commerce Order Flow

Open `architectures/ecommerce-platform.json`.

Identify the relationships for the order flow:
- Frontend → API Gateway
- API Gateway → Order Service
- Order Service → Payment Service
- Payment Service → Database

**Prompt:**
```
@workspace /CALM

Add a flows array at the top level of architectures/ecommerce-platform.json (after controls, before nodes).

Create a flow with:
- unique-id: "order-processing-flow"
- name: "Customer Order Processing"
- description: "End-to-end flow from customer placing an order to payment confirmation"
- transitions array with 4 transitions:
  1. relationship-unique-id: "frontend-to-gateway", sequence-number: 1, summary: "Customer submits order via web interface", direction: "source-to-destination"
  2. relationship-unique-id: "gateway-to-order", sequence-number: 2, summary: "API Gateway routes order to Order Service", direction: "source-to-destination"
  3. relationship-unique-id: "order-to-payment", sequence-number: 3, summary: "Order Service initiates payment processing", direction: "source-to-destination"
  4. relationship-unique-id: "payment-to-db", sequence-number: 4, summary: "Payment Service records transaction in database", direction: "source-to-destination"

Use the actual relationship unique-ids from your architecture.
```

### 3. Validate Flow Structure

```bash
calm validate -a architectures/ecommerce-platform.json
```

Should pass! ✅

### 4. Add a Second Flow: User Authentication

**Prompt:**
```
@workspace /CALM

Add a second flow to the flows array in architectures/ecommerce-platform.json:

- unique-id: "user-authentication-flow"
- name: "User Login Authentication"
- description: "User authentication and session establishment"
- transitions (adjust relationship IDs to match your architecture):
  1. Frontend → API Gateway: "User submits credentials"
  2. API Gateway → User Service: "Validate credentials"
  3. User Service → Database: "Retrieve user account data"
  4. User Service → API Gateway (destination-to-source): "Return authentication token"
  5. API Gateway → Frontend (destination-to-source): "Deliver session token to user"
```

### 5. Visualize Flows

The VSCode preview may show flows as annotations or overlays.

**Steps:**
1. Save `architectures/ecommerce-platform.json`
2. Open preview (Ctrl+Shift+C)
3. Look for flow indicators on the diagram
4. **Take a screenshot** showing the architecture with flows

### 6. Generate Flow Documentation

Use docify to generate flow documentation.

```bash
calm docify --architecture architectures/ecommerce-platform.json --output docs/generated/ecommerce-with-flows
```

**Steps:**
1. Open `docs/generated/ecommerce-with-flows/index.html` in a browser
2. Look for flow descriptions in the generated documentation
3. **Take a screenshot** of the flow documentation

### 7. Add Flow Controls (Optional Advanced)

Flows can have their own controls!

**Prompt:**
```
@workspace /CALM

Add a controls section to the order-processing-flow in architectures/ecommerce-platform.json:

Add an "audit" control with:
- description: "All order processing steps must be logged for audit compliance"
- requirements:
  - control-requirement-url: "https://internal-policy.example.com/audit/transaction-logging"
```

### 8. Document Your Flows

**File:** `docs/flows-guide.md`

**Content:**
```markdown
# Business Flows

## Order Processing Flow

**ID:** order-processing-flow  
**Purpose:** Track customer orders from placement to payment

### Steps
1. Customer submits order (Frontend → API Gateway)
2. Route to order processing (API Gateway → Order Service)
3. Initiate payment (Order Service → Payment Service)
4. Record transaction (Payment Service → Database)

### Controls
- Transaction logging required for audit compliance

## User Authentication Flow

**ID:** user-authentication-flow  
**Purpose:** Authenticate users and establish sessions

### Steps
1. User submits credentials (Frontend → API Gateway)
2. Validate credentials (API Gateway → User Service)
3. Retrieve account (User Service → Database)
4. Return token (User Service ← API Gateway)
5. Deliver session (API Gateway ← Frontend)

## Benefits

- **Business Alignment:** Maps technical architecture to business processes
- **Impact Analysis:** Understand which components are involved in each business capability
- **Compliance:** Attach specific controls to business-critical flows
- **Documentation:** Auto-generate flow diagrams and descriptions
```

### 9. Commit Your Work

```bash
git add architectures/ecommerce-platform.json docs/flows-guide.md docs/generated README.md
git commit -m "Day 11: Model order processing and authentication flows"
git tag day-11
```

## Deliverables

✅ **Required:**
- `architectures/ecommerce-platform.json` - With 2+ flows
- `docs/flows-guide.md` - Flow documentation
- `docs/generated/ecommerce-with-flows/` - Generated documentation
- Screenshots of flow visualization
- Updated `README.md` - Day 11 marked complete

✅ **Validation:**
```bash
# Verify flows exist
grep -q '"flows"' architectures/ecommerce-platform.json

# Check both flows
grep -q 'order-processing-flow' architectures/ecommerce-platform.json
grep -q 'user-authentication-flow' architectures/ecommerce-platform.json

# Validate
calm validate -a architectures/ecommerce-platform.json

# Check documentation generated
test -f docs/generated/ecommerce-with-flows/index.html

# Check tag
git tag | grep -q "day-11"
```

## Resources
- [CALM Flow Schema](https://github.com/finos/architecture-as-code/blob/main/calm/draft/2025-03/meta/flow.json)
- [Flow Examples](https://github.com/finos/architecture-as-code/tree/main/calm/release)

## Tips
- Flows are ordered - sequence-number matters
- Use bidirectional transitions for request-response patterns
- Flows can reference the same relationships multiple times
- Add flow-specific controls for critical business processes
- Use meaningful summaries that describe business intent, not just technical details

## Next Steps
Tomorrow (Day 12) you'll add multiple interface types to your nodes!
