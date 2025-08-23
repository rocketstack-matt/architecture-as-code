# CALM IntelliJ Plugin (Experimental)

Status: Experimental — APIs, behavior, and visuals may change. Use at your own risk.

Live-visualize CALM (Common Architecture Language Model) architecture models while you edit them. See structure, navigate quickly, validate, and explore your architecture models — all within IntelliJ IDEA.

## Features

- **CALM Model Detection**: Automatically detects JSON and YAML files containing CALM architecture models
- **Tool Window**: Dedicated CALM tool window showing model elements (Nodes, Relationships, Flows) in a tree view
- **Graph Preview**: Visual representation of CALM models with basic graph visualization (placeholder implementation)
- **Navigation**: Click elements in the tree view to navigate to their definitions in the source file
- **File Watching**: Automatic refresh when CALM files are modified
- **Settings**: Configurable options for auto-open behavior, default layout, and file patterns
- **Multi-format Support**: Works with both JSON and YAML CALM model files

## Installation

### Prerequisites
- IntelliJ IDEA 2023.2 or later
- Java 17 or later
- Gradle 7.0 or later

### Development Setup

1. Clone the repository
2. Navigate to the IntelliJ plugin directory:
   ```bash
   cd calm-plugins/intellij
   ```
3. Build the plugin:
   ```bash
   ./gradlew build
   ```
4. Run the plugin in a development instance:
   ```bash
   ./gradlew runIde
   ```

### Installing from Build

1. Build the plugin:
   ```bash
   ./gradlew buildPlugin
   ```
2. The plugin ZIP will be created in `build/distributions/`
3. In IntelliJ IDEA, go to **File → Settings → Plugins**
4. Click the gear icon and select **Install Plugin from Disk...**
5. Select the generated ZIP file

## Usage

1. Open a CALM model file (JSON or YAML) in IntelliJ IDEA
2. The CALM tool window will appear on the right side (if not visible, go to **View → Tool Windows → CALM**)
3. The tool window shows the model structure in a tree view:
   - **Nodes**: System components and services
   - **Relationships**: Connections between nodes
   - **Flows**: Data or control flows
4. Click on any element in the tree to navigate to its definition in the source file
5. Use **Tools → CALM → Open Preview** or the keyboard shortcut `Ctrl+Shift+C` to open the graph preview

## Configuration

Access settings via **File → Settings → Tools → CALM**:

- **Auto-open preview**: Automatically open CALM preview when opening CALM files
- **Default layout**: Choose the default graph layout algorithm (dagre, fcose, cose)
- **Show labels**: Show labels by default in graph view
- **File patterns**: Comma-separated glob patterns for CALM model files

## Model Formats

The plugin supports CALM models in both JSON and YAML formats. The parser normalizes common field variants:

- Node IDs via `id` or `unique-id`
- Node types via `type` or `node-type` 
- Relationship types via `type` or `relationship-type`
- Supports `connects`, `deployed-in`, `composed-of` relationship shapes
- Flow definitions via `flows[]` arrays

## Architecture

The plugin is built using:

- **Kotlin** for the main implementation
- **IntelliJ Platform SDK** for IDE integration
- **Jackson** for JSON/YAML parsing
- **Gradle** with IntelliJ Plugin Development plugin for build automation

### Key Components

- `CalmModelService`: Core service for parsing and validating CALM models
- `CalmToolWindowFactory`: Creates the tool window for model exploration
- `CalmPreviewEditor`: File editor provider for graph visualization
- `CalmTreeModel`: Tree model for displaying model elements
- `CalmSettings`: Persistent settings storage

## Current Limitations

- **Graph visualization**: Currently shows a basic text-based placeholder. A full graph visualization would require integration with a Java graph library (JGraphX, JUNG) or embedding a web view with Cytoscape.js
- **Advanced features**: Some advanced features from the VSCode plugin (like hover information, code lens) are not yet implemented
- **Large models**: Performance with very large models has not been tested
- **Layout algorithms**: Graph layout algorithms are planned but not yet implemented

## Future Enhancements

- **Enhanced Graph Visualization**: Integration with a proper graph visualization library
- **Interactive Graph**: Drag-and-drop node positioning, zoom, pan
- **Code Assistance**: Hover information, auto-completion, validation
- **Export Options**: Export diagrams as images or other formats
- **CLI Integration**: Integration with CALM CLI tools for validation and generation
- **Theme Support**: Better integration with IntelliJ themes

## Contributing

This plugin is part of the FINOS Architecture as Code project. See the main repository for contribution guidelines.

## License

See the repository LICENSE file.

## Troubleshooting

### Plugin doesn't recognize CALM files
- Check that your file contains valid JSON or YAML
- Ensure the file has `nodes`, `relationships`, or `flows` arrays
- Verify file extension is `.json`, `.yaml`, or `.yml`

### Tool window is empty
- Try opening a different CALM file
- Check the IntelliJ logs for any error messages
- Ensure the file content is valid CALM model format

### Graph preview not working
- The current implementation shows a basic text visualization
- Full graph support requires additional development

For more help, check the main repository documentation or file an issue.