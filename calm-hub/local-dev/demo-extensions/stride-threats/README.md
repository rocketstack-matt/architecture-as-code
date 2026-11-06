# stride-threats

A demo extension for local development: STRIDE threats (Spoofing, Tampering, Repudiation,
Information disclosure, Denial of service, Elevation of privilege), their severity and their
mitigations. With [release-tracker](../release-tracker/README.md), it shows how two extensions share
each UI extension point. `server.mjs` is its backend: it has no dependencies, and it uses the
identity verifier of [example-services](../../extensions/example-services/identity.mjs).

| Contribution | Where the UI shows it |
|---|---|
| `screen` "Threat model" | The Extensions group of the side menu, and the home page card |
| `landing-card` "Threat posture" | The home page card: the first 3 figures of its `stats` block |
| `action` "Start STRIDE assessment", `designer-tab` "Threats" | The Extensions tab of an architecture or pattern |
| `detail-panel` "STRIDE threats" | The Extensions section of the node details |
| `decorator-views` "STRIDE threats" | Badges on the diagram for `threat-model` decorators |

Run it with release-tracker as the [demo-extensions README](../README.md) says. The routes take the
resource from the query (`namespace`, `resource`, `version`, `selectedElement`), not from the path.

## Overlay

The view maps `data.severity` to a status: `low` is ok, `medium` is warn, `high` and `critical` are
error. The badge label is `data.summary`, and the newest decorator of each `data.threat-id` counts.
To write example decorators for each node of an architecture version, run from `calm-hub/`:

```bash
node local-dev/demo-extensions/stride-threats/seed-decorators.mjs demo 1 1.0.0
```

The arguments are the namespace, the numeric architecture id and the version (these are the
defaults). The script reads the nodes from Hub and skips a decorator that is already there. Set
`CALM_HUB_URL` for another Hub, and `CALM_HUB_TOKEN` to send a bearer token.

The nodes `web-app`, `api-gateway`, `user-service`, `order-service`, `database` and `message-queue`
have a fixed set of threats. Any other node gets one generated threat, and the detail panel shows the
same threats as the overlay.

Test the routes and the seed decorators with
`node --test local-dev/demo-extensions/stride-threats/routes.test.mjs`. Set `PORT`, `CALM_HUB_URL`
(where the backend gets the JWKS) or `CALM_HUB_ISSUER` to change the backend defaults.
