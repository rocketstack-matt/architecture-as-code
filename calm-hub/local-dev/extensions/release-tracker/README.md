# release-tracker

A demo extension for local development. It uses every UI extension point: a screen, a landing card,
an action, a designer tab, a detail panel and a decorator view. Use it to check the CALM Hub UI
layout. `server.mjs` is its backend: it has no dependencies, and it uses the identity verifier of
[example-services](../example-services/identity.mjs). The data is made up.

| Contribution | Where the UI shows it |
|---|---|
| `screen` | The Extensions group of the side menu, and the home page card |
| `landing-card` | The home page card: the first 3 figures of its `stats` block |
| `action`, `designer-tab` | The Extensions tab of an architecture or pattern |
| `detail-panel` | The Extensions section of the node details |
| `decorator-views` | Badges on the diagram for `release-risk` decorators |

Run it from `calm-hub/`, with the keys and settings in the
[example-services README](../example-services/README.md), and add its backend URL:

```bash
../mvnw quarkus:dev -Pstandalone,server-only \
  -Dcalm.extensions.dir=local-dev/extensions \
  -Dcalm.extensions.example-services.backend-url=http://localhost:8091 \
  -Dcalm.extensions.release-tracker.backend-url=http://localhost:8092 \
  -Dcalm.extensions.identity.private-key-location=../sandbox/keys/hub-private.pem \
  -Dcalm.extensions.identity.public-key-locations=../sandbox/keys/hub-public.pem \
  -Dcalm.extensions.allow-without-auth=true

# In another shell
node local-dev/extensions/release-tracker/server.mjs
```

The detail panel has data for the nodes `web-app`, `api-gateway`, `user-service`, `order-service`,
`database` and `message-queue`. To see the overlay, add a decorator of type `release-risk` with
`data.risk` set to `low`, `medium` or `high`, and `data.summary` set to a short text.

Set `PORT`, `CALM_HUB_URL` or `CALM_HUB_ISSUER` to change the defaults.
