---
id: hub-extension-blocks
title: Hub extension blocks
---

A Tier 1 extension returns JSON. Hub draws the content; no extension code runs in the browser.
Use `hubApi: 0`. Get the reply schema from
`GET /api/calm/extensions/schema/0/blocks.schema.json`.

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
Block routes must be read-only GET routes. Hub calls `/api/calm/extensions/{id}/api/...` and
passes available `namespace`, `resource` (`type/id`), `version`, and `selectedElement` (element ID)
as request parameters. Route placeholders can use these names. Global screens and landing cards
have no selected resource. No token contains this UI context.

An `action` contribution declares a button on the landing page and resource toolbar. Hub calls its route and asks for confirmation when
`readOnly` is false. Context also goes in the JSON body for methods other than GET and DELETE.
Actions do not accept user input or render a reply in this version.
