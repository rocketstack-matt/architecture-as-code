# Advent of CALM: 24-Day Progressive Challenge Plan

## Overview
A structured learning journey that takes participants from zero CALM knowledge to being able to model production architectures and contribute to the community in 24 days.

## Progress Tracker

### Week 1: Foundation & First Steps (Days 1-7)
- [x] Day 1: Install CALM CLI and Initialize Your Architecture Repository
- [x] Day 2: Create Your First Node
- [x] Day 3: Connect Nodes with Relationships
- [x] Day 4: Install the CALM VSCode Extension
- [x] Day 5: Add Interfaces to Nodes
- [x] Day 6: Document with Metadata
- [x] Day 7: Build a Complete E-Commerce Microservice Architecture

### Week 2: Patterns, Controls & Flows (Days 8-13)
- [x] Day 8: Create Your First Pattern - CALM's Superpower
- [x] Day 9: Reverse-Engineer a Pattern from Your Architecture
- [x] Day 10: Add a Security Control
- [x] Day 11: Model a Business Flow
- [x] Day 12: Add Multiple Interface Types
- [x] Day 13: Link to an ADR

### Week 3: Tooling & Automation (Days 14-18)
- [x] Day 14: Generate Documentation with Docify
- [x] Day 15: Create a Custom Template
- [x] Day 16: Set Up CALM Hub Locally
- [x] Day 17: Advanced AI-Powered Architecture Refactoring
- [x] Day 18: Automate Validation in CI/CD

### Week 4: Real-World Application & Community (Days 19-24)
- [x] Day 19: Model Your Actual System Architecture
- [x] Day 20: Add Deployment Topology
- [x] Day 21: Model Data Lineage
- [x] Day 22: Create a Migration from Existing Documentation
- [x] Day 23: Contribute to the CALM Community
- [x] Day 24: Present Your CALM Journey

---

## Week 1: Foundation & First Steps (Days 1-6)
**Goal:** Get comfortable with CALM basics and create your first architecture

### Day 1: Install CALM CLI and Initialize Your Architecture Repository ✅
**Challenge:** Install `@finos/calm-cli`, create a git repository with proper structure, and enable GitHub Copilot chatmode for AI assistance
**Rationale:** Start with proper foundations - git-based workflow, AI assistance, and CLI tools. All progress tracked in commits for validation and portfolio building.
**Deliverable:** Repository with README, directory structure, chatmode configuration, tagged commit `day-1`

### Day 2: Create Your First Node ✅
**Challenge:** Use GitHub Copilot with the CALM chatmode to create your first CALM architecture file with a single node
**Rationale:** Learn to leverage AI for architecture authoring. The chatmode provides Copilot with deep CALM schema knowledge. Teaches both CALM concepts AND effective AI-powered workflows.
**Deliverable:** `architectures/my-first-architecture.json` with at least one valid node, commit tagged `day-2`

### Day 3: Connect Nodes with Relationships ✅
**Challenge:** Add multiple nodes (database, actor, system) and create three different relationship types (interacts, connects, composed-of)
**Rationale:** Learn when to use each relationship type. Understand the oneOf constraint pattern. Architectures are about connections, not just components.
**Deliverable:** Architecture with 4 nodes and 3 different relationship types, commit tagged `day-3`

### Day 4: Add Interfaces to Nodes ✅
**Challenge:** Add interfaces to service and database nodes using both inline and external definition approaches, then reference specific interfaces in connections
**Rationale:** Interfaces make architecture actionable. Learn inline vs external definitions, understand node-interface structure for precise connections, and see how organizations can create interface catalogs.
**Deliverable:** Nodes with interfaces, updated connects relationship with interface references, optional external interface schema, commit tagged `day-4`

### Day 5: Document with Metadata ✅
**Challenge:** Add metadata at multiple levels (architecture, nodes, relationships) to document ownership, versioning, and operational information
**Rationale:** Metadata transforms architecture files into living documentation. Critical for governance, discoverability, and long-term maintenance.
**Deliverable:** Architecture with metadata at all three levels, commit tagged `day-5`

### Day 6: Build a Complete E-Commerce Microservice Architecture ✅
**Challenge:** Create a comprehensive e-commerce order processing system with 6-8 nodes, multiple relationship types, interfaces, and rich metadata
**Rationale:** Week 1 synthesis - combine all concepts (nodes, relationships, interfaces, metadata) into a realistic, production-quality architecture.
**Deliverable:** Complete e-commerce architecture with 8 nodes, 8+ relationships, generated documentation, commit tagged `day-6`

---

## Week 2: Patterns, Controls & Flows (Days 7-12)
**Goal:** Master intermediate CALM concepts and governance features

### Day 7: Validate Against a Pattern
**Challenge:** Use `calm validate` to check your architecture against a predefined pattern from the repo; fix any violations
**Rationale:** Understand pattern-driven architecture. Learn the difference between warnings and errors.
**Deliverable:** Architecture that passes pattern validation with zero errors, commit tagged `day-7`

### Day 8: Create Your Own Pattern
**Challenge:** Write a CALM pattern that enforces architectural standards (e.g., all databases must be deployed-in a specific network)
**Rationale:** Patterns enable architectural governance. Learn JSON Schema constructs like required, enum, pattern.
**Deliverable:** Custom pattern file in `patterns/` with at least 2 constraints, commit tagged `day-8`

### Day 9: Add a Security Control
**Challenge:** Add a control to your architecture (e.g., encryption-at-rest, authentication requirement)
**Rationale:** Controls document security, compliance, and operational requirements. Critical for regulated industries.
**Deliverable:** Architecture with at least one control with requirements, commit tagged `day-9`

### Day 10: Model a Business Flow
**Challenge:** Create a flow that maps a business process across your architecture (e.g., user authentication flow)
**Rationale:** Flows connect technical architecture to business processes. Essential for business-IT alignment.
**Deliverable:** Architecture with a flow containing multiple steps, commit tagged `day-10`

### Day 11: Add Multiple Interface Types
**Challenge:** Add different interface types to your nodes (REST API, database connection, message queue)
**Rationale:** Real systems have heterogeneous integration patterns. Practice different protocol types.
**Deliverable:** Architecture with at least 3 different interface types, commit tagged `day-11`

### Day 12: Link to an ADR
**Challenge:** Write an Architecture Decision Record (markdown file) and link it in your CALM architecture's ADRs array
**Rationale:** Connect decisions to implementation. Practice external reference patterns.
**Deliverable:** Architecture with ADR links + at least one ADR document in `docs/adr/`, commit tagged `day-12`

---

## Week 3: Tooling & Automation (Days 13-18)
**Goal:** Leverage the full CALM ecosystem

### Day 13: Generate Documentation with Docify
**Challenge:** Use `calm docify` to generate a documentation website from your architecture
**Rationale:** Architecture is only useful if it's consumable. See the value of machine-readable formats.
**Deliverable:** Generated documentation in `docs/generated/`, commit tagged `day-13`

### Day 14: Create a Custom Template
**Challenge:** Build a Handlebars template bundle that generates a custom format (e.g., architecture summary, system diagram markdown)
**Rationale:** Templates enable custom outputs for different audiences. Learn the template system.
**Deliverable:** Template bundle in `templates/` + generated output, commit tagged `day-14`

### Day 15: Set Up CALM Hub Locally
**Challenge:** Run CALM Hub using docker-compose and upload your architecture via the API
**Rationale:** Centralized architecture storage enables team collaboration and discovery.
**Deliverable:** Documentation of API interaction (curl commands or screenshots), commit tagged `day-15`

### Day 16: Install the VSCode Extension
**Challenge:** Install the CALM VSCode plugin and use it to edit/validate your architecture
**Rationale:** IDE integration improves developer experience. Real-time validation prevents errors.
**Deliverable:** Screenshot or description of validation in VSCode, commit tagged `day-16`

### Day 17: Use AI to Enhance Your Architecture
**Challenge:** Use the GitHub Copilot chatmode (from Day 1) to add a new complex node with interfaces and relationships
**Rationale:** AI can accelerate architecture authoring. Learn effective prompting for architecture work.
**Deliverable:** Description of AI interaction + enhanced architecture, commit tagged `day-17`

### Day 18: Automate Validation in CI/CD
**Challenge:** Create a GitHub Action workflow that validates your CALM architecture on commit
**Rationale:** Architecture as Code means architecture in version control with automated validation.
**Deliverable:** `.github/workflows/validate-calm.yml` that runs `calm validate`, commit tagged `day-18`

---

## Week 4: Real-World Application & Community (Days 19-24)
**Goal:** Apply CALM to real scenarios and contribute back

### Day 19: Model Your Actual System Architecture
**Challenge:** Create a CALM architecture for a real system you work on (at least 10 nodes)
**Rationale:** Move from learning to doing. Apply knowledge to actual work.
**Deliverable:** Production-ready architecture document, commit tagged `day-19`

### Day 20: Add Deployment Topology
**Challenge:** Use "deployed-in" relationships to model where your services run (regions, clusters, networks)
**Rationale:** Deployment topology is critical for operations, DR, and security.
**Deliverable:** Architecture with deployment relationships, commit tagged `day-20`

### Day 21: Model Data Lineage
**Challenge:** Use flows to document how data moves through your system
**Rationale:** Data lineage is essential for GDPR, compliance, and debugging.
**Deliverable:** Flow showing data movement from source to destination, commit tagged `day-21`

### Day 22: Create a Migration from Existing Documentation
**Challenge:** Take existing architecture docs (diagram, wiki, etc.) and convert to CALM
**Rationale:** Most teams have existing docs. Migration is a real-world scenario.
**Deliverable:** Before/after comparison showing CALM version, commit tagged `day-22`

### Day 23: Contribute to the CALM Community
**Challenge:** Report an issue, answer a question, or contribute to CALM documentation
**Rationale:** Open source thrives on contribution. Give back to learn more.
**Deliverable:** Link to issue, PR, or community interaction in README, commit tagged `day-23`

### Day 24: Present Your CALM Journey
**Challenge:** Create a summary blog post (in your repo) with your complete architecture, lessons learned, and what you'll do next
**Rationale:** Reflection solidifies learning. Sharing helps others. Creates a portfolio piece.
**Deliverable:** Blog post in `JOURNEY.md` with summary of all 24 days, commit tagged `day-24`

---

## Pedagogical Design Rationale

### Progressive Complexity
- **Days 1-6:** Single concepts in isolation (one node, one relationship)
- **Days 7-12:** Combining concepts (patterns + validation, flows + relationships)
- **Days 13-18:** Tools and automation (expanding beyond hand-editing JSON)
- **Days 19-24:** Synthesis and real-world application

### Immediate Feedback Loops
- Each challenge produces a tangible, validatable artifact
- Git commits provide clear checkpoints and rollback capability
- Validation ensures participants don't get stuck on broken JSON
- Tags enable automated checking and portfolio demonstration

### Multi-Modal Learning
- **Hands-on:** Days 2-6, 9-11, 19-22 (editing JSON)
- **Tool-based:** Days 1, 7, 13-18 (using CLI/Hub/VSCode)
- **Conceptual:** Days 8, 12, 21 (patterns, ADRs, flows)
- **Social:** Days 23-24 (community engagement)

### Real-World Applicability
- By Day 19, participants can model actual systems
- Days 20-22 cover common enterprise needs (deployment, data lineage, migration)
- Skills transfer directly to documentation and governance work

### Weekend-Friendly Pacing
- Days 1-2 (likely weekend): Setup and basics
- Days 8-9 (second weekend): Patterns and controls (can be conceptual)
- Days 15-16 (third weekend): Infrastructure setup (Hub, VSCode)
- Days 22-24 (final weekend/holidays): Synthesis and contribution

### Git-Based Validation
- All deliverables are committed to a git repository
- Each day has a distinct tag (`day-1`, `day-2`, etc.)
- Enables programmatic validation of submissions
- Creates a portfolio artifact participants can share
- Supports rollback and experimentation

---

## Implementation Notes

### Repository Structure Participants Will Build
```
advent-of-calm-2025/
├── .github/
│   ├── chatmodes/
│   │   └── CALM.chatmode.md
│   └── workflows/
│       └── validate-calm.yml
├── architectures/
│   ├── my-first-architecture.json
│   ├── microservice-system.json
│   └── production-system.json
├── patterns/
│   └── my-governance-pattern.json
├── templates/
│   └── my-template-bundle/
├── docs/
│   ├── adr/
│   │   └── 001-architecture-decision.md
│   └── generated/
├── README.md
├── JOURNEY.md
└── .gitignore
```

### Success Metrics
- Participants complete at least 18/24 challenges (75%)
- At least one production-ready architecture created (Day 19)
- At least one community contribution (Day 23)
- Portfolio repository they can share publicly

### Support Resources Needed
- Example solutions for each day (reference implementations)
- Troubleshooting FAQ
- Community support channel (FINOS Slack, GitHub Discussions)
- Office hours or live Q&A sessions weekly
