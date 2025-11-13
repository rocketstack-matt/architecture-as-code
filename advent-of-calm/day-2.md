# Day 2: Create Your First Node

## Overview
Use the CALM chatmode you configured on Day 1 to create your first architecture file with AI assistance.

## Objective and Rationale
- **Objective:** Create a valid CALM architecture JSON file containing a single node using GitHub Copilot and the CALM chatmode
- **Rationale:** Learn to leverage AI for architecture authoring. The chatmode you installed provides Copilot with deep CALM schema knowledge, making it an expert assistant. This teaches both CALM concepts AND effective AI-powered workflows.

## Requirements

### 1. Understand What a Node Represents
A **node** in CALM represents a distinct architectural component:
- **actor**: External users or systems
- **system**: High-level business systems
- **service**: Microservices or applications
- **database**: Data storage systems
- **network**: Network infrastructure
- **ldap**: Directory services
- **webclient**: Browser-based clients
- **data-asset**: Data products or datasets

### 2. Open the CALM Chatmode in VSCode

1. Open your `advent-of-calm-2025` repository in VSCode
2. Open the Copilot Chat panel:
   - **Windows/Linux**: `Ctrl+Alt+I` or click the chat icon in the sidebar
   - **Mac**: `Cmd+Shift+I` or click the chat icon in the sidebar
3. In the chat input, type `@workspace` followed by `/CALM` to activate the CALM chatmode
4. You should see the chatmode indicator showing you're using CALM-specific guidance

### 3. Use This Prompt with Copilot

Copy and paste this prompt into the Copilot chat (customize the parts in brackets):

```
@workspace /CALM

Create a new CALM architecture file at architectures/my-first-architecture.json

The architecture should contain a single node representing [describe a system you work with, e.g., "a payment processing service that handles credit card transactions"].

Use appropriate node-type, and include a meaningful unique-id, name, and description.

Make sure the file includes the correct $schema reference and validates against the CALM 1.0 specification.
```

**Example customized prompt:**
```
@workspace /CALM

Create a new CALM architecture file at architectures/my-first-architecture.json

The architecture should contain a single node representing a customer authentication service that validates user credentials and manages session tokens.

Use appropriate node-type, and include a meaningful unique-id, name, and description.

Make sure the file includes the correct $schema reference and validates against the CALM 1.0 specification.
```

### 4. Review the AI's Output

Copilot will generate the file. **Important:** Don't blindly accept it! Review and verify:

- ✅ File is in the correct location: `architectures/my-first-architecture.json`
- ✅ Contains `$schema` property pointing to CALM 1.0
- ✅ Has a `nodes` array with your node
- ✅ Node has all required properties: `unique-id`, `node-type`, `name`, `description`
- ✅ The `node-type` is appropriate for what you're modeling
- ✅ The `unique-id` uses kebab-case (e.g., "auth-service" not "AuthService")

### 5. Validate Your Architecture

```bash
calm validate -a architectures/my-first-architecture.json
```

If validation fails:
- Read the error message carefully
- Ask Copilot to fix it: `@workspace /CALM Fix the validation errors in architectures/my-first-architecture.json`
- Validate again

### 6. Understand What Was Created

Open the generated file and make sure you understand each part:
- What does the `$schema` property do?
- Why are there four required properties on a node?
- What would happen if you changed the `node-type`?

**Try this:** Ask Copilot to explain:
```
@workspace /CALM Explain each property in the node I just created
```

### 7. Commit Your Work

```bash
git add architectures/my-first-architecture.json README.md
git commit -m "Day 2: Create first CALM architecture with single node using AI assistance"
git tag day-2
```

Update your README.md progress:
```markdown
- [x] Day 1: Install CALM CLI and Initialize Repository
- [x] Day 2: Create Your First Node
```

## Deliverables / Validation Criteria

Your Day 2 submission should include a commit tagged `day-2` containing:

✅ **Required Files:**
- `architectures/my-first-architecture.json` - Valid CALM architecture with at least one node
- Updated `README.md` - Day 2 marked as complete

✅ **Validation:**
```bash
# Architecture validates without errors
calm validate -a architectures/my-first-architecture.json

# Check git tag exists
git tag | grep -q "day-2"
```

## Resources
- [CALM Schema Core Definition](https://github.com/finos/architecture-as-code/blob/main/calm/release/1.0/meta/core.json)
- [GitHub Copilot Chat Documentation](https://docs.github.com/en/copilot/using-github-copilot/asking-github-copilot-questions-in-your-ide)

## Tips
- The chatmode makes Copilot a CALM expert - use it liberally!
- If you don't have Copilot access, you can manually create the file following this structure:
  ```json
  {
    "$schema": "https://calm.finos.org/release/1.0/meta/calm.json",
    "nodes": [
      {
        "unique-id": "your-service-id",
        "node-type": "service",
        "name": "Your Service Name",
        "description": "What your service does"
      }
    ]
  }
  ```
- Ask Copilot follow-up questions if you don't understand something
- Use `@workspace /CALM` before each prompt to ensure you're using the chatmode

## Troubleshooting

**"I don't see /CALM in the chatmode list"**
- Make sure you ran `calm copilot-chatmode -d .` on Day 1
- Check that `.github/chatmodes/CALM.chatmode.md` exists
- Restart VSCode and try again

**"Copilot generated an invalid file"**
- Run `calm validate` to see the specific errors
- Share the error with Copilot and ask it to fix
- Remember: AI is a tool, not magic - you're still in charge!

**"I don't have GitHub Copilot"**
- You can manually create the file using the example structure above
- The chatmode file itself is good documentation you can reference
- Consider this a prompt for what you need to create

## Next Steps
Tomorrow (Day 3) you'll ask Copilot to add a second node and create your first relationship!
