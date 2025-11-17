# Day 10: Add a Security Control

## Overview
Document security and compliance requirements using CALM's controls feature to capture governance needs.

## Objective and Rationale
- **Objective:** Add a security control to your e-commerce architecture to document compliance requirements
- **Rationale:** Controls enable architectural governance by documenting security, compliance, and operational requirements. They connect technical architectures to regulatory and policy frameworks, making compliance auditable.

## Requirements

### 1. Understand Controls

Controls in CALM consist of:
- **Domain key:** Category (e.g., `security`, `compliance`, `operational`)
- **Description:** What the control addresses
- **Requirements:** Array of requirement specifications with:
  - `control-requirement-url`: Link to the requirement definition
  - `control-config-url` (optional): Link to how it's implemented

Controls can be at:
- **Architecture level:** Apply to the entire system
- **Node level:** Apply to specific components

### 2. Add an Architecture-Level Security Control

Open your `architectures/ecommerce-platform.json` from Day 7.

**Prompt:**
```
@workspace /CALM

Add a controls section at the top level of architectures/ecommerce-platform.json

Add a "security" control with:
- description: "Data encryption and secure communication requirements"
- requirements array with two items:
  - control-requirement-url: "https://internal-policy.example.com/security/encryption-at-rest"
  - control-requirement-url: "https://internal-policy.example.com/security/tls-1-3-minimum"
    control-config-url: "https://github.com/myorg/security-configs/tls-config.yaml"

Place it after the metadata section and before nodes.
```

### 3. Add a Node-Level Control

Add a control to the `payment-service` node.

**Prompt:**
```
@workspace /CALM

Add a controls section to the payment-service node in architectures/ecommerce-platform.json

Add a "compliance" control with:
- description: "PCI-DSS compliance for payment processing"
- requirements array:
  - control-requirement-url: "https://www.pcisecuritystandards.org/documents/PCI-DSS-v4.0"
  - control-config-url: "https://github.com/myorg/compliance/pci-dss-config.json"
```

### 4. Validate

```bash
calm validate -a architectures/ecommerce-platform.json
```

Should pass! ✅

### 5. Visualize with Controls

Open `architectures/ecommerce-platform.json` and preview (Ctrl+Shift+C).

Controls won't appear in the visual diagram, but they're documented in the JSON for governance tools to process.

### 6. Add a Control to Your Pattern

Update your pattern to enforce controls.

**Prompt:**
```
@workspace /CALM

Update patterns/ecommerce-platform-pattern.json to require the security control at the architecture level.

Add to the pattern's properties section:
- controls with const value matching the security control from step 2
- Add controls to the required array at top level
```

### 7. Test Pattern Validation

```bash
calm validate -p patterns/ecommerce-platform-pattern.json -a architectures/ecommerce-platform.json
```

Should pass! ✅

### 8. Create Documentation

**File:** `docs/controls-guide.md`

**Content:**
```markdown
# CALM Controls Guide

## Purpose
Controls document security, compliance, and operational requirements in architecture.

## Controls in This Architecture

### Architecture-Level Controls

**Security**
- Encryption at rest: https://internal-policy.example.com/security/encryption-at-rest
- TLS 1.3 minimum: Configured via https://github.com/myorg/security-configs/tls-config.yaml

### Node-Level Controls

**Payment Service - PCI-DSS Compliance**
- Requirement: https://www.pcisecuritystandards.org/documents/PCI-DSS-v4.0
- Configuration: https://github.com/myorg/compliance/pci-dss-config.json

## Benefits

1. **Audit Trail:** Links architecture to compliance requirements
2. **Governance:** Enforces standards via patterns
3. **Traceability:** Connects technical implementation to policy
```

### 9. Commit Your Work

```bash
git add architectures/ecommerce-platform.json patterns/ecommerce-platform-pattern.json docs/controls-guide.md README.md
git commit -m "Day 10: Add security and compliance controls"
git tag day-10
```

## Deliverables

✅ **Required:**
- `architectures/ecommerce-platform.json` - With architecture and node-level controls
- `patterns/ecommerce-platform-pattern.json` - Updated to require controls
- `docs/controls-guide.md` - Control documentation
- Updated `README.md` - Day 10 marked complete

✅ **Validation:**
```bash
# Verify controls exist in architecture
grep -q '"controls"' architectures/ecommerce-platform.json

# Verify both levels
grep -A 5 '"security"' architectures/ecommerce-platform.json | grep -q 'encryption'
grep -A 5 '"compliance"' architectures/ecommerce-platform.json | grep -q 'PCI-DSS'

# Validate
calm validate -a architectures/ecommerce-platform.json
calm validate -p patterns/ecommerce-platform-pattern.json -a architectures/ecommerce-platform.json

# Check tag
git tag | grep -q "day-10"
```

## Resources
- [CALM Controls Schema](https://github.com/finos/architecture-as-code/blob/main/calm/draft/2025-03/meta/control.json)
- [PCI-DSS Standards](https://www.pcisecuritystandards.org/)

## Tips
- Use meaningful URLs that point to actual policy documents
- Controls make architecture auditable and traceable to requirements
- Patterns can enforce mandatory controls across all architectures
- Consider adding controls for: authentication, authorization, data retention, logging

## Next Steps
Tomorrow (Day 11) you'll model a business flow across your architecture!
