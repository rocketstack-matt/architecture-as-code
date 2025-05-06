# CALM Tour

This is an interactive tour of the Common Architecture Language Model (CALM), based on the JSON Schema Tour. It helps users learn about CALM concepts through interactive examples.

## Getting Started

```bash
# Install dependencies
pnpm install

# Generate outline from content
pnpm run generate-outline

# Start development server
pnpm run dev
```

Visit http://localhost:3000 to see the tour.

## Content Structure

The content is organized in the following structure:

```
content/
├── 01-Getting-Started/
│   ├── index.mdx
│   ├── 01-Your-First-Architecture/
│       ├── instructions.mdx
│       ├── code.ts
│   ├── 02-Understanding-Nodes/
│       ├── instructions.mdx
│       ├── code.ts
├── 02-Node-Types/
│   ├── index.mdx
│   ├── 01-System-Nodes/
│       ├── instructions.mdx
│       ├── code.ts
```

Each lesson consists of:
- `instructions.mdx`: Markdown with lesson content and explanations
- `code.ts`: JSON example that users will edit in the interactive editor

## Development

When adding new content:

1. Add your lesson folder following the structure above
2. Run `pnpm run generate-outline` to update the navigation
3. Test your content in the development server

## Deployment

Build the site with:

```bash
pnpm run build
```

The site can then be deployed to your preferred hosting platform.