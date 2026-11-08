---
id: hub-extension-blocks
title: Hub extension blocks
---

A Tier 1 extension returns JSON. Hub draws the content; no extension code runs in the browser.
Use `hubApi: 0`. Get the reply schema from
`GET /api/calm/extensions/schema/0/blocks.schema.json`.
For an example of each block and table cell, see the [blocks reference](../calm-hub/extension-blocks.md).
For the fields of each extension point, see the [extension point reference](../calm-hub/extension-points.md).

Declare a route and reference its `id` from a contribution:

```json
{
  "routes": [{ "id": "summary", "method": "GET", "path": "/summary", "scope": "authenticated", "readOnly": true }],
  "contributes": { "screen": [{ "id": "summary", "title": "Summary", "route": "summary" }] }
}
```

Return this body from `/summary`:

```json
{
  "hubApi": 0,
  "blocks": [
    { "type": "markdown", "text": "## Service summary" },
    { "type": "stats", "items": [{ "label": "Services", "value": 12 }] }
  ]
}
```

Other block types are `keyValue`, `table`, `cards`, `alert`, and `links`. The schema defines their fields.
Markdown ignores raw HTML. Links accept an external HTTP(S) `href`, or a `hub` object with
`namespace`, `type`, `id`, and `version`. An unknown block shows a placeholder.

The same contract supports `designer-tab`, `landing-card`, and node `detail-panel` contributions.
Block routes must use GET. Hub calls `/api/calm/extensions/{id}/api/...` and
passes available `namespace`, `resource` (`type/id`), `resourceType` (`architectures`, `patterns`, …),
`resourceId`, `version`, and `selectedElement` (element ID) as request parameters. Route placeholders
can use these names, but Hub refuses a slash in a path, so use `{resourceType}/{resourceId}` in a
route path and `resource` only as a parameter. Global screens and landing cards
have no selected resource. No token contains this UI context.

## Where Hub shows each contribution

| Contribution | Where it shows |
|---|---|
| `screen` | Its own page, linked from the **Extensions** group of the side menu |
| `landing-card` | A compact card in the **Extensions** section of the home page |
| `action`, `designer-tab` | The **Extensions** tab of an architecture or pattern. Each extension has a collapsible section: its actions as buttons, then its designer tabs |
| `detail-panel` | The **Extensions** section of the node details. Each extension has a collapsible sub-section |
| `decorator-views` | Badges on the diagram, and rows in its legend |

Hub opens the first section and closes the others. It remembers each choice in the browser. A
closed section sends no request.

### What a landing card shows

The home page card shows the extension `name` and `provider`, and a headline from the first
`landing-card` reply:

- the first three items of the first `stats` block, or
- when that block has no valid item, the text of the first `alert` block, on one line.

A valid item has a string `label` and a string or number `value`. Hub ignores other items. If a card
cannot render, it shows an error and the other cards stay. Hub does not show the other blocks on the card. Put the detail on a `screen`: the card opens
the first `screen` of the extension. A card without a `screen` is not a link.

## Actions

An `action` contribution declares a button in the Extensions tab. Hub calls its route and asks for confirmation when
`readOnly` is false. Context also goes in the JSON body for methods other than GET and DELETE.
Actions show only when their route placeholders have context values.
Actions do not accept user input or render a reply in this version.
