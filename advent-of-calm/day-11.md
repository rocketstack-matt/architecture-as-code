# Day 11: Generate Documentation with Docify

## Overview
Transform your CALM architecture into browsable HTML documentation using the docify command.

## Objective and Rationale
- **Objective:** Use `calm docify` to generate comprehensive documentation website from your architecture
- **Rationale:** Machine-readable architecture (JSON) needs human-readable outputs. Docify generates documentation automatically, ensuring docs stay in sync with architecture. Essential for stakeholder communication and onboarding.

## Requirements

### 1. Understand Docify

The `calm docify` command generates documentation in multiple modes:
- **Website mode (default):** Full HTML website with navigation
- **Template mode:** Single file using custom template
- **Template-dir mode:** Multiple files using template bundle

### 2. Generate Default Documentation Website

```bash
calm docify --architecture architectures/ecommerce-platform.json --output docs/generated/ecommerce-docs
```

This creates a complete HTML website with:
- Index page with architecture overview
- Node details pages
- Relationship visualization
- Flow diagrams
- Control and metadata display

### 3. Explore Generated Documentation

**Steps:**
1. Open `docs/generated/ecommerce-docs/index.html` in a browser
2. Navigate through different sections:
   - Architecture overview
   - Node catalog
   - Relationships
   - Flows
   - Controls
3. **Take screenshots** of:
   - Main index page
   - A node detail page
   - Flow visualization (if available)

### 4. Customize Output with URL Mapping

If you have local ADR files, map them for documentation:

```bash
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --output docs/generated/ecommerce-docs-with-adrs \
  --url-to-local-file-mapping docs/adr
```

This makes local ADR references clickable in generated docs.

### 5. Create a Custom Template

Handlebars templates allow custom documentation formats.

**File:** `templates/architecture-summary.hbs`

**Content:**
```handlebars
# {{metadata.title}} Architecture Summary

**Version:** {{metadata.version}}  
**Owner:** {{metadata.owner}}

## Overview
{{metadata.description}}

## Components

This architecture contains **{{nodes.length}}** nodes:

{{#each nodes}}
- **{{this.name}}** ({{this.node-type.name}}): {{this.description}}
{{/each}}

## Integrations

This architecture has **{{relationships.length}}** connections:

{{#each relationships}}
- {{this.description}}
  - Protocol: {{this.relationship-type.connects.protocol}}
{{/each}}

## Flows

{{#if flows}}
{{#each flows}}
### {{this.name}}
{{this.description}}

Steps:
{{#each this.transitions}}
{{this.sequence-number}}. {{this.summary}}
{{/each}}

{{/each}}
{{else}}
No flows defined yet.
{{/if}}

## Controls

{{#if controls}}
{{#each controls}}
### {{@key}}
{{this.description}}

{{/each}}
{{else}}
No controls defined yet.
{{/if}}

---
*Generated from CALM architecture on {{metadata.timestamp}}*
```

### 6. Generate Documentation Using Custom Template

```bash
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --template templates/architecture-summary.hbs \
  --output docs/generated/architecture-summary.md
```

Open `docs/generated/architecture-summary.md` - it's a markdown summary!

### 7. Create a Node Catalog Template

**File:** `templates/node-catalog.hbs`

**Content:**
```handlebars
# Node Catalog

## Architecture: {{metadata.title}}

Total Nodes: {{nodes.length}}

---

{{#each nodes}}
## {{this.name}}

**ID:** `{{this.unique-id}}`  
**Type:** {{this.node-type.name}}  
**Description:** {{this.description}}

{{#if this.interfaces}}
### Interfaces
{{#each this.interfaces}}
- **{{this.unique-id}}**
  {{#if this.host}}
  - Host: {{this.host}}
  {{/if}}
  {{#if this.port}}
  - Port: {{this.port}}
  {{/if}}
  {{#if this.url}}
  - URL: {{this.url}}
  {{/if}}
{{/each}}
{{else}}
No interfaces defined.
{{/if}}

{{#if this.controls}}
### Controls
{{#each this.controls}}
- **{{@key}}:** {{this.description}}
{{/each}}
{{/if}}

{{#if this.metadata}}
### Metadata
{{#each this.metadata}}
- **{{@key}}:** {{this}}
{{/each}}
{{/if}}

---

{{/each}}
```

### 8. Generate Node Catalog

```bash
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --template templates/node-catalog.hbs \
  --output docs/generated/node-catalog.md
```

### 9. Create a Documentation README

**File:** `docs/generated/README.md`

**Content:**
```markdown
# Generated Documentation

This directory contains auto-generated documentation from CALM architectures.

## Available Documentation

### Full Website
- **Location:** `ecommerce-docs/index.html`
- **Generated with:** `calm docify --architecture architectures/ecommerce-platform.json --output docs/generated/ecommerce-docs`
- **Content:** Complete browsable website with all architecture details

### Architecture Summary
- **Location:** `architecture-summary.md`
- **Template:** `templates/architecture-summary.hbs`
- **Content:** High-level overview with counts and lists

### Node Catalog
- **Location:** `node-catalog.md`
- **Template:** `templates/node-catalog.hbs`
- **Content:** Detailed listing of all nodes with interfaces and controls

## Regenerating Documentation

To update documentation after architecture changes:

\`\`\`bash
# Full website
calm docify --architecture architectures/ecommerce-platform.json --output docs/generated/ecommerce-docs

# Custom templates
calm docify --architecture architectures/ecommerce-platform.json --template templates/architecture-summary.hbs --output docs/generated/architecture-summary.md
calm docify --architecture architectures/ecommerce-platform.json --template templates/node-catalog.hbs --output docs/generated/node-catalog.md
\`\`\`

## Benefits

1. **Always Up-to-Date:** Regenerate from source of truth
2. **Multiple Formats:** Website, markdown, custom formats
3. **Stakeholder Communication:** Human-readable architecture
4. **Onboarding:** New team members can browse documentation
```

### 10. Add Documentation Generation Script

**File:** `scripts/generate-docs.sh`

**Content:**
```bash
#!/bin/bash
set -e

echo "🏗️  Generating CALM documentation..."

# Full website
echo "📖 Generating website documentation..."
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --output docs/generated/ecommerce-docs \
  --url-to-local-file-mapping docs/adr

# Architecture summary
echo "📄 Generating architecture summary..."
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --template templates/architecture-summary.hbs \
  --output docs/generated/architecture-summary.md

# Node catalog
echo "📋 Generating node catalog..."
calm docify \
  --architecture architectures/ecommerce-platform.json \
  --template templates/node-catalog.hbs \
  --output docs/generated/node-catalog.md

echo "✅ Documentation generation complete!"
echo "   View at: docs/generated/ecommerce-docs/index.html"
```

Make it executable:
```bash
chmod +x scripts/generate-docs.sh
```

### 11. Test Documentation Generation

```bash
./scripts/generate-docs.sh
```

Verify all documentation was generated successfully.

### 12. Update Your README

Document Day 11 progress in your README: mark the checklist, describe the new documentation outputs, and link to `docs/generated/README.md` or the screenshots so stakeholders know where to browse the generated sites.

### 13. Commit Your Work

```bash
git add templates/ docs/generated/ scripts/generate-docs.sh README.md
git commit -m "Day 11: Generate documentation with docify and custom templates"
git tag day-11
```

## Deliverables

✅ **Required:**
- `docs/generated/ecommerce-docs/` - Full website documentation
- `docs/generated/architecture-summary.md` - Custom summary
- `docs/generated/node-catalog.md` - Custom node catalog
- `templates/architecture-summary.hbs` - Custom template
- `templates/node-catalog.hbs` - Custom template
- `scripts/generate-docs.sh` - Documentation generation script
- `docs/generated/README.md` - Documentation guide
- Screenshots of generated documentation
- Updated `README.md` - Day 11 marked complete

✅ **Validation:**
```bash
# Verify generated documentation exists
test -f docs/generated/ecommerce-docs/index.html
test -f docs/generated/architecture-summary.md
test -f docs/generated/node-catalog.md

# Verify templates exist
test -f templates/architecture-summary.hbs
test -f templates/node-catalog.hbs

# Verify script exists and is executable
test -x scripts/generate-docs.sh

# Run generation
./scripts/generate-docs.sh

# Check tag
git tag | grep -q "day-11"
```

## Resources

- [Docify Documentation](https://github.com/finos/architecture-as-code/tree/main/cli#docify)
- [Handlebars Templates](https://handlebarsjs.com/guide/)
- [CALM Template Examples](https://github.com/finos/architecture-as-code/tree/main/cli/test_fixtures/template)

## Tips

- Regenerate documentation after every architecture change
- Use custom templates for different audiences (executives vs. developers)
- Add documentation generation to CI/CD pipeline
- Templates can access all CALM properties (nodes, relationships, flows, controls)
- Use `--url-to-local-file-mapping` to make local file references clickable

## Next Steps
Tomorrow (Day 12) you'll add multiple interface types to your architecture!
