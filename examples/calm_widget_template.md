# {{architecture.metadata.0.name}}

## Executive Summary

{{architecture.metadata.0.summary}}

---

## System Overview

### Components Architecture
{{ table architecture.nodes columns='unique-id,name,node-type,description' }}

### Service Components
{{ table architecture.nodes filter='node-type:service' columns='unique-id,name,description' }}

### Data Stores
{{ table architecture.nodes filter='node-type:database' columns='unique-id,name,description' }}

### Network Components
{{ table architecture.nodes filter='node-type:network' columns='unique-id,name,description' }}

### External Systems
{{ table architecture.nodes filter='node-type:webclient' columns='unique-id,name,description' }}

---

## Business Processes & Flows

{{#if architecture.flows}}
### Business Flow Overview
{{ table architecture.flows columns='unique-id,name,description' }}

{{#each architecture.flows}}
### {{name}}

**Description:** {{description}}

{{#if requirement-url}}
**Requirements:** [{{requirement-url}}]({{requirement-url}})
{{/if}}

#### Process Steps
| Step | Component | Action | Direction |
|------|-----------|---------|-----------|
{{#each transitions}}
| {{sequence-number}} | {{summary}} | {{summary}} | {{direction}} |
{{/each}}

{{#if controls}}
#### Process Controls
{{ table controls }}
{{/if}}

{{#if metadata}}
#### Process Metadata
{{ table metadata }}
{{/if}}

{{/each}}
{{else}}
_No business flows defined in this architecture._
{{/if}}

---

## Integration Architecture

### System Relationships
{{ table architecture.relationships columns='unique-id,relationship-type,protocol' }}

### API Connections
{{ table architecture.relationships filter='protocol:HTTPS' columns='unique-id,parties.source.node,parties.destination.node,protocol' }}

### Database Connections
{{ table architecture.relationships filter='protocol:JDBC' columns='unique-id,parties.source.node,parties.destination.node,protocol' }}

### Secure Connections
{{ table architecture.relationships filter='protocol:mTLS' columns='unique-id,parties.source.node,parties.destination.node,protocol' }}

---

## Component Details

{{#each architecture.nodes}}
### {{name}}

**Type:** {{node-type}}  
**Description:** {{description}}

{{#if interfaces}}
#### Interfaces
{{ table interfaces }}
{{/if}}

{{#if controls}}
#### Security & Compliance Controls
{{ table controls }}

{{#each controls}}
##### {{@key}} Controls
{{ table this }}

{{#each requirements}}
###### Requirement {{@index}}
{{ table this }}
{{/each}}

{{/each}}
{{/if}}

{{#if metadata}}
#### Component Metadata
{{ table metadata }}
{{/if}}

---

{{/each}}

## Security Architecture

### Security Controls Overview

{{#if architecture.nodes}}
{{#each architecture.nodes}}
{{#if controls}}
#### {{name}} Security Controls
{{ table controls }}
{{/if}}
{{/each}}
{{/if}}

### Connection Security
{{ table architecture.relationships filter='protocol:HTTPS' columns='unique-id,protocol,parties.source.node,parties.destination.node' }}
{{ table architecture.relationships filter='protocol:mTLS' columns='unique-id,protocol,parties.source.node,parties.destination.node' }}

---

## Deployment Architecture

### Deployment Relationships
{{ table architecture.relationships filter='relationship-type:deployed-in' columns='unique-id,parties.source.node,parties.destination.node' }}

### Infrastructure Components
{{ table architecture.nodes filter='node-type:system' columns='unique-id,name,description' }}

---

## Non-Functional Requirements

### Performance Requirements
{{#each architecture.flows}}
{{#if metadata}}
#### {{name}} Performance
{{ table metadata }}
{{/if}}
{{/each}}

### Component SLAs
{{#each architecture.nodes}}
{{#if metadata}}
#### {{name}} Requirements
{{ table metadata }}
{{/if}}
{{/each}}

---

## Technical Specifications

### Service Configurations
{{#each architecture.nodes}}
{{#if (eq node-type 'service')}}
#### {{name}}
{{#if interfaces}}
{{ table interfaces }}
{{/if}}
{{/if}}
{{/each}}

### Database Configurations
{{#each architecture.nodes}}
{{#if (eq node-type 'database')}}
#### {{name}}
{{#if interfaces}}
{{ table interfaces }}
{{/if}}
{{/if}}
{{/each}}

### Network Configurations
{{#each architecture.nodes}}
{{#if (eq node-type 'network')}}
#### {{name}}
{{#if interfaces}}
{{ table interfaces }}
{{/if}}
{{/if}}
{{/each}}

---

## Appendices

### All Architecture Nodes
{{ table architecture.nodes }}

### All Relationships
{{ table architecture.relationships }}

{{#if architecture.flows}}
### All Business Flows
{{ table architecture.flows }}
{{/if}}

### Complete Architecture Metadata
{{#if architecture.metadata}}
{{ table architecture.metadata }}
{{else}}
_No architecture metadata available_
{{/if}}

---
