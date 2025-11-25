# Day 16: Create a Custom Template Bundle

## Overview
Build a comprehensive template bundle to generate multiple documentation artifacts from your architecture.

## Objective and Rationale
- **Objective:** Create a template bundle with multiple Handlebars templates for different documentation outputs
- **Rationale:** Different stakeholders need different views. Template bundles allow you to generate technical docs, executive summaries, security assessments, and integration guides from the same source architecture.

## Requirements

### 1. Understand Template Bundles

A template bundle is a directory containing:
- Multiple `.hbs` (Handlebars) template files
- Each template generates a different output file
- Use `--template-dir` to generate all at once

### 2. Create Template Bundle Directory

```bash
mkdir -p templates/comprehensive-bundle
```

### 3. Create Executive Summary Template

**File:** `templates/comprehensive-bundle/executive-summary.hbs`

**Content:**
```handlebars
# Executive Summary: {{metadata.title}}

**Document Version:** {{metadata.version}}  
**Last Updated:** {{metadata.timestamp}}  
**Architecture Owner:** {{metadata.owner}}

## System Overview

{{metadata.description}}

## System Metrics

- **Total Components:** {{nodes.length}}
- **Integration Points:** {{relationships.length}}
- **Business Processes:** {{#if flows}}{{flows.length}}{{else}}0{{/if}}
- **Security Controls:** {{#if controls}}Documented below{{else}}0{{/if}}

## Component Breakdown

{{#if nodes}}
{{#each nodes}}
- **{{this.name}}** ({{this.node-type.name}}) - {{this.description}}
{{/each}}
{{else}}
No components defined yet.
{{/if}}

## Security & Compliance

{{#if controls}}
This architecture implements the following security and compliance controls:

{{#each controls}}
### {{@key}}
{{this.description}}

{{#if this.requirements}}
Requirements:
{{#each this.requirements}}
- {{this.control-requirement-url}}{{#if this.control-config-url}} (Config: {{this.control-config-url}}){{/if}}
{{/each}}
{{/if}}

{{/each}}
{{else}}
No formal controls documented yet.
{{/if}}

## Business Processes

{{#if flows}}
{{#each flows}}
- **{{this.name}}:** {{this.description}} ({{this.transitions.length}} steps)
{{/each}}
{{else}}
No business flows documented yet.
{{/if}}

## Recommendations

- Regular architecture reviews recommended quarterly
- Update architecture documentation when adding new services
- Review security controls annually

---
*This executive summary was auto-generated from the CALM architecture model.*
```

### 4. Create Technical Integration Guide Template

**File:** `templates/comprehensive-bundle/integration-guide.hbs`

**Content:**
```handlebars
# Integration Guide: {{metadata.title}}

## Overview

This guide provides technical integration details for the {{metadata.title}} architecture.

## Service Endpoints

{{#each nodes}}
{{#if this.interfaces}}
### {{this.name}}

**Service Type:** {{this.node-type.name}}  
**Description:** {{this.description}}

#### Available Interfaces

{{#each this.interfaces}}
**Interface ID:** `{{this.unique-id}}`

{{#if this.url}}
- **Type:** REST API
- **URL:** `{{this.url}}`
- **Usage:** Base URL for all API calls
{{/if}}

{{#if this.host}}
{{#if this.port}}
- **Type:** Network Service
- **Host:** `{{this.host}}`
- **Port:** `{{this.port}}`
- **Connection String:** `{{this.host}}:{{this.port}}`
{{/if}}
{{/if}}

{{#if this.audiences}}
- **Type:** OAuth2 Configuration
- **Audiences:** {{#each this.audiences}}`{{this}}` {{/each}}
{{/if}}

{{/each}}

{{#if this.metadata}}
#### Configuration
{{#each this.metadata}}
- **{{@key}}:** {{this}}
{{/each}}
{{/if}}

---

{{/if}}
{{/each}}

## Integration Patterns

{{#each relationships}}
### {{this.description}}

**Connection:** {{this.relationship-type.connects.source-node}} → {{this.relationship-type.connects.destination-node}}  
**Protocol:** {{this.relationship-type.connects.protocol}}

{{#if this.relationship-type.connects.interfaces}}
**Interfaces Used:** {{#each this.relationship-type.connects.interfaces}}`{{this}}` {{/each}}
{{/if}}

{{/each}}

## Authentication

{{#each nodes}}
{{#each this.interfaces}}
{{#if this.audiences}}
### {{../name}} - OAuth2

This service uses OAuth2 authentication.

**Accepted Audiences:**
{{#each this.audiences}}
- `{{this}}`
{{/each}}

**Token Requirements:**
- Valid JWT token in Authorization header
- Format: `Authorization: Bearer <token>`
- Token must include appropriate audience claim

{{/if}}
{{/each}}
{{/each}}

---
*Generated from CALM architecture. Contact {{metadata.owner}} for questions.*
```

### 5. Create Security Assessment Template

**File:** `templates/comprehensive-bundle/security-assessment.hbs`

**Content:**
```handlebars
# Security Assessment Report

**Architecture:** {{metadata.title}}  
**Assessment Date:** {{metadata.timestamp}}  
**Classification:** {{#if metadata.classification}}{{metadata.classification}}{{else}}Not Specified{{/if}}

## Control Summary

{{#if controls}}
This architecture has implemented the following control domains.

{{#each controls}}
## Control Domain: {{@key}}

**Description:** {{this.description}}

### Requirements

{{#each this.requirements}}
#### Requirement {{@index}}
- **Requirement URL:** {{this.control-requirement-url}}
{{#if this.control-config-url}}
- **Configuration:** {{this.control-config-url}}
- **Status:** ✅ Configured
{{else}}
- **Status:** ⚠️ Configuration needed
{{/if}}

{{/each}}

{{/each}}

{{else}}
⚠️ **WARNING:** No security controls documented at the architecture level.
{{/if}}

## Component Security Analysis

{{#each nodes}}
### {{this.name}}

**Type:** {{this.node-type.name}}  
**Controls:** {{#if this.controls}}✅ Implemented{{else}}❌ Not Implemented{{/if}}

{{#if this.controls}}
{{#each this.controls}}
#### {{@key}}
{{this.description}}

{{#each this.requirements}}
- {{this.control-requirement-url}}
{{/each}}

{{/each}}
{{else}}
⚠️ No component-level controls defined.
{{/if}}

---

{{/each}}

## Security Recommendations

{{#unless controls}}
1. **Critical:** Define architecture-level security controls
2. **Critical:** Implement encryption and authentication requirements
{{/unless}}

3. Review and update security controls quarterly
4. Ensure all external interfaces use secure protocols (HTTPS, TLS)
5. Document incident response procedures

## Protocol Security

{{#each relationships}}
{{#if this.relationship-type.connects.protocol}}
- {{this.relationship-type.connects.source-node}} → {{this.relationship-type.connects.destination-node}}: **{{this.relationship-type.connects.protocol}}** {{#if (eq this.relationship-type.connects.protocol "HTTPS")}}✅{{else if (eq this.relationship-type.connects.protocol "HTTP")}}⚠️ Insecure{{else}}ℹ️{{/if}}
{{/if}}
{{/each}}

---
*This security assessment is auto-generated. Manual review required.*
```

### 6. Create Flow Documentation Template

**File:** `templates/comprehensive-bundle/flow-documentation.hbs`

**Content:**
```handlebars
# Business Flow Documentation

**Architecture:** {{metadata.title}}

{{#if flows}}
This architecture documents **{{flows.length}}** business flow(s).

{{#each flows}}
## {{this.name}}

**Flow ID:** `{{this.unique-id}}`  
**Description:** {{this.description}}

### Process Steps

{{#each this.transitions}}
**Step {{this.sequence-number}}:** {{this.summary}}  
- **Relationship:** `{{this.relationship-unique-id}}`
- **Direction:** {{this.direction}}

{{/each}}

### Flow Controls

{{#if this.controls}}
{{#each this.controls}}
#### {{@key}}
{{this.description}}

Requirements:
{{#each this.requirements}}
- {{this.control-requirement-url}}
{{/each}}

{{/each}}
{{else}}
No specific controls defined for this flow.
{{/if}}

---

{{/each}}

{{else}}
No business flows documented in this architecture.

**Recommendation:** Document key business processes as flows to:
- Enable business-IT alignment
- Support impact analysis
- Facilitate compliance mapping
{{/if}}

---
*Generated from CALM architecture model.*
```

### 7. Create Deployment Checklist Template

**File:** `templates/comprehensive-bundle/deployment-checklist.hbs`

**Content:**
```handlebars
# Deployment Checklist: {{metadata.title}}

## Pre-Deployment

### Infrastructure
{{#each nodes}}
- [ ] **{{this.name}}** ({{this.node-type.name}})
  {{#if this.interfaces}}
  {{#each this.interfaces}}
  {{#if this.host}}
  - [ ] Verify {{this.host}} is accessible
  {{/if}}
  {{#if this.port}}
  - [ ] Ensure port {{this.port}} is open
  {{/if}}
  {{#if this.url}}
  - [ ] Validate URL {{this.url}} is configured
  {{/if}}
  {{/each}}
  {{/if}}
{{/each}}

### Integrations
{{#each relationships}}
- [ ] **{{this.description}}**
  - Protocol: {{this.relationship-type.connects.protocol}}
  - Source: {{this.relationship-type.connects.source-node}}
  - Destination: {{this.relationship-type.connects.destination-node}}
{{/each}}

### Security Controls
{{#if controls}}
{{#each controls}}
- [ ] **{{@key}}**: {{this.description}}
  {{#each this.requirements}}
  - [ ] Verify {{this.control-requirement-url}}
  {{/each}}
{{/each}}
{{else}}
- [ ] **WARNING:** Define security controls before deployment
{{/if}}

## Post-Deployment

### Verification
{{#each flows}}
- [ ] **Test {{this.name}}**
  {{#each this.transitions}}
  - [ ] Step {{this.sequence-number}}: {{this.summary}}
  {{/each}}
{{/each}}

### Monitoring
- [ ] Set up health checks for all services
- [ ] Configure alerting
- [ ] Verify logging is operational

### Documentation
- [ ] Update runbooks
- [ ] Document connection strings
- [ ] Share integration guide with teams

---
**Deployment Owner:** {{metadata.owner}}  
**Version:** {{metadata.version}}
```

### 8. Generate All Documentation from Bundle

```bash
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --template-dir templates/comprehensive-bundle \
  --output docs/generated/comprehensive
```

This generates all templates at once in the `docs/generated/comprehensive/` directory.

### 9. Create Bundle README

**File:** `templates/comprehensive-bundle/README.md`

**Content:**
```markdown
# Comprehensive Documentation Template Bundle

This template bundle generates complete documentation sets from CALM architectures.

## Templates

| Template | Output | Audience |
|----------|--------|----------|
| `executive-summary.hbs` | `executive-summary.md` | Executives, stakeholders |
| `integration-guide.hbs` | `integration-guide.md` | Developers, integrators |
| `security-assessment.hbs` | `security-assessment.md` | Security team, auditors |
| `flow-documentation.hbs` | `flow-documentation.md` | Business analysts, PMs |
| `deployment-checklist.hbs` | `deployment-checklist.md` | DevOps, SRE |

## Usage

\`\`\`bash
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --template-dir templates/comprehensive-bundle \
  --output docs/generated/comprehensive
\`\`\`

## Customization

Edit any `.hbs` file to customize output for your organization's needs.

### Handlebars Features Used

- `{{#if}}` - Conditional rendering
- `{{#each}}` - Iteration over arrays
- `{{@key}}` - Object property names
- `{{metadata.property}}` - Dot notation access
```

### 10. Update Documentation Script

```bash
cat >> scripts/generate-docs.sh << 'EOF'

# Comprehensive template bundle
echo "📦 Generating comprehensive documentation bundle..."
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --template-dir templates/comprehensive-bundle \
  --output docs/generated/comprehensive

echo "✅ All documentation generated!"
echo "   Comprehensive docs: docs/generated/comprehensive/"
EOF
```

### 11. Test Bundle Generation

```bash
chmod +x scripts/generate-docs.sh
./scripts/generate-docs.sh
```

Verify all files in `docs/generated/comprehensive/` were created.

### 12. Update Your README

Summarize the new comprehensive template bundle in your README before committing. Mark Day 16 complete, list the five templates plus `docs/generated/comprehensive`, and mention that `scripts/generate-docs.sh` now handles the bundle.

### 13. Commit Your Work

```bash
git add templates/comprehensive-bundle docs/generated/comprehensive scripts/generate-docs.sh README.md
git commit -m "Day 16: Create comprehensive template bundle for multi-stakeholder documentation"
git tag day-16
```

## Deliverables

✅ **Required:**
- `templates/comprehensive-bundle/` directory with 5 templates
- `docs/generated/comprehensive/` with all generated docs
- `templates/comprehensive-bundle/README.md`
- Updated `scripts/generate-docs.sh`
- Updated `README.md` - Day 16 marked complete

✅ **Validation:**
```bash
# Verify templates exist
test -f templates/comprehensive-bundle/executive-summary.hbs
test -f templates/comprehensive-bundle/integration-guide.hbs
test -f templates/comprehensive-bundle/security-assessment.hbs
test -f templates/comprehensive-bundle/flow-documentation.hbs
test -f templates/comprehensive-bundle/deployment-checklist.hbs

# Generate bundle
calm docify --architecture architectures/ecommerce-platform.json --template-dir templates/comprehensive-bundle --output docs/generated/comprehensive

# Verify all outputs
test -f docs/generated/comprehensive/executive-summary.md
test -f docs/generated/comprehensive/integration-guide.md

# Check tag
git tag | grep -q "day-16"
```

## Resources
- [Handlebars Documentation](https://handlebarsjs.com/)
- [CALM Template System](https://github.com/finos/architecture-as-code/tree/main/cli#templates)

## Tips
- Create templates for each stakeholder type
- Use conditionals (`{{#if}}`) to handle optional sections gracefully
- Test templates with minimal and maximal architectures
- Template bundles enable "single source, multiple outputs"
- Consider CI/CD integration to auto-publish documentation

## Next Steps
Tomorrow (Day 17) you'll use AI to perform advanced architecture refactoring!
