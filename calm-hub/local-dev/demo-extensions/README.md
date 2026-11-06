# Demo extensions

Two demo extensions for local development. Each uses every UI extension point, so the two compete for
every slot: the home page, the side menu, the Extensions tab, the node details and the overlay legend.
The data is made up.

| Folder | Extension | Backend port | Decorator type |
|---|---|---|---|
| [release-tracker](release-tracker/README.md) | Release tracker | 8092 | `release-risk` |
| [stride-threats](stride-threats/README.md) | STRIDE threat model | 8093 | `threat-model` |

Hub loads every manifest in this folder, and does not start if one has no backend URL. Run both from
`calm-hub/`, with the keys from the [example-services README](../extensions/example-services/README.md):

```bash
../mvnw quarkus:dev -Pstandalone,server-only \
  -Dcalm.extensions.dir=local-dev/demo-extensions \
  -Dcalm.extensions.release-tracker.backend-url=http://localhost:8092 \
  -Dcalm.extensions.stride-threats.backend-url=http://localhost:8093 \
  -Dcalm.extensions.identity.private-key-location=../sandbox/keys/hub-private.pem \
  -Dcalm.extensions.identity.public-key-locations=../sandbox/keys/hub-public.pem \
  -Dcalm.extensions.allow-without-auth=true

# In other shells
node local-dev/demo-extensions/release-tracker/server.mjs
node local-dev/demo-extensions/stride-threats/server.mjs
```

To run one demo only, add `-Dcalm.extensions.<id>.enabled=false` for the other.

Both backends accept only the issuer `http://localhost:8080`, which is the default of
`calm.hub.base-url`. If you set `calm.hub.base-url`, set `CALM_HUB_ISSUER` to the same value.
