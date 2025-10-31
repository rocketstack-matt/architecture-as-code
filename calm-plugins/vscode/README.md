# CALM VS Code Extension

> **Status**: Experimental - APIs, behavior, and visuals may change. Use at your own risk.

Live-visualize CALM architecture models while you edit them. Features an interactive preview, tree navigation, intelligent validation, and documentation generation.

## Features

### 🔀 Hybrid Editor Mode (New!)
- **Tabbed Interface**: Edit source and preview in the same editor with tabs
- **Seamless Switching**: Toggle between Source and Preview views
- **Integrated Experience**: No need for side-by-side panels
- **Keyboard Shortcut**: Press `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac) to open
- **Context Menu**: Right-click any CALM file to "Open in Hybrid Editor"

### 🎯 Interactive Preview Panel
- **Live Architecture Visualization**: Real-time diagram generation as you edit
- **Smart Layout**: Automatic positioning with multiple layout options
- **Interactive Elements**: Click to inspect, navigate between components

### 🌳 Tree View Navigation
- **Structured Overview**: Browse Nodes, Relationships, and Flows
- **Quick Navigation**: Jump between editor and preview
- **Search & Filter**: Find elements across large models

### ✨ Smart Editor Features
- **Hover Information**: Rich tooltips for model elements
- **Auto-Refresh**: Preview updates automatically on save
- **Diagnostics Integration**: Validation errors in Problems panel


![CALM VS Code Extension](https://raw.githubusercontent.com/finos/architecture-as-code/main/calm-plugins/vscode/docs/CalmVSExtension.png)
*Interactive preview with tree navigation, editor integration, and live visualization*


### 📋 Template & Documentation Mode
- **Documentation Generation**: Create docs from CALM models
- **Live Mode**: Auto-refresh as you edit
- **Multiple Formats**: HTML and Markdown output
- **Custom Templates**: Use built-in or custom templates

![Live Docify Mode](https://raw.githubusercontent.com/finos/architecture-as-code/main/calm-plugins/vscode/docs/LiveDocifyMode.png)
*Live templating mode with real-time documentation generation*

## Usage

### Opening CALM Files

You can work with CALM files in two modes:

1. **Classic Mode** (Default): 
   - Open a CALM file normally in VS Code
   - Use `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac) to open the preview panel beside the editor
   - Preview appears in a separate panel with tabs for Docify, Template, and Model views

2. **Hybrid Mode** (New!):
   - Right-click a CALM file and select "CALM: Open in Hybrid Editor"
   - Or use `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac) while editing a CALM file
   - Editor opens with Source and Preview tabs in the same window
   - Switch between tabs to edit or view your architecture model

### Configuration

You can configure the default editor mode in VS Code settings:

```json
{
  "calm.editor.defaultMode": "hybrid"  // or "classic"
}
```

## Getting Involved

Architecture as Code was developed as part of the [DevOps Automation Special Interest Group](https://devops.finos.org/) before graduating as a top level project in it's own right. Our community Zoom meetups take place on the fourth Tuesday of every month, see [here](https://github.com/finos/architecture-as-code/issues?q=label%3Ameeting) for upcoming and previous meetings. For active contributors we have Office Hours every Thursday, see the [FINOS Event Calendar](http://calendar.finos.org) for meeting details.

Have an idea or feedback? [Raise an issue](https://github.com/finos/architecture-as-code/issues/new/choose) in this repository.

---

**Contributing**: Issues and PRs welcome!
