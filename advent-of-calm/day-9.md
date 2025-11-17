# Day 9: Reverse-Engineer a Pattern from Your E-Commerce Architecture

## Overview
Transform your existing e-commerce architecture into a reusable pattern that others can use to generate similar systems.

## Objective and Rationale
- **Objective:** Create a pattern based on your e-commerce architecture from Day 7, then test it by generating and validating new architectures
- **Rationale:** Patterns don't always start from scratch - often you have a great architecture and want to make it reusable. Learn to reverse-engineer architectures into patterns, enabling teams to share proven designs and enforce consistency.

## Requirements

### 1. Understand Pattern Extraction

Your Day 7 architecture has actual values - to make it a pattern, wrap structural values in `const` and use `prefixItems`.

**What to constrain:**
- ✅ Structure (IDs, node types, relationship connections)
- ✅ Security defaults (HTTPS protocols, required security metadata)
- ❌ Deployment details (specific hosts, ports) - let users customize

### 2. Review Your E-Commerce Architecture

Open `architectures/ecommerce-platform.json` from Day 7.

**Prompt:**
```text
Analyze architectures/ecommerce-platform.json and tell me:

1. How many nodes does it have and what are their unique-ids?
2. How many relationships and what types?
3. What structure should I preserve in a pattern (IDs, types, connections)?
4. What should I leave flexible for customization (hosts, ports, specific metadata)?
```

### 3. Create the E-Commerce Pattern

**File:** `patterns/ecommerce-platform-pattern.json`

**Prompt:**
```text
Create patterns/ecommerce-platform-pattern.json based on architectures/ecommerce-platform.json

Follow the same pattern structure as web-app-pattern.json but with all the nodes and relationships from my e-commerce architecture.

Preserve as const:
- All unique-ids
- All names  
- All node-types
- All descriptions
- All relationship-type structures
- All protocols

Set minItems and maxItems to match the exact counts.
Use prefixItems to define the exact structure.
```

### 4. Test Generation

Generate a new architecture from your pattern:

```bash
calm generate -p patterns/ecommerce-platform-pattern.json -o architectures/ecommerce-variation.json
```

### 5. Visualize Both Versions

Compare the original and generated:

**Steps:**
1. Open `architectures/ecommerce-platform.json` and view preview
2. **Take a screenshot**
3. Open `architectures/ecommerce-variation.json` and view preview
4. **Take a screenshot**
5. Compare - structure should be identical, some values will be placeholders

### 6. Validate Both Against the Pattern

```bash
calm validate -p patterns/ecommerce-platform-pattern.json -a architectures/ecommerce-platform.json
calm validate -p patterns/ecommerce-platform-pattern.json -a architectures/ecommerce-variation.json
```

Both should pass! ✅

### 7. Commit Your Work

```bash
git add patterns/ecommerce-platform-pattern.json architectures/ecommerce-variation.json patterns/README.md docs/screenshots README.md
git commit -m "Day 9: Reverse-engineer e-commerce architecture into reusable pattern"
git tag day-9
```

## Deliverables

✅ **Required Files:**
- `patterns/ecommerce-platform-pattern.json`
- `architectures/ecommerce-variation.json`
- Screenshots showing both architectures
- Updated `README.md`

## Next Steps
Tomorrow (Day 10) you'll add security controls to document compliance requirements!
