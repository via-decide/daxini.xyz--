# Daxini Ecosystem Map

## Scope
This document maps the six ecosystem systems requested in the stress-test and the wiring points implemented in this repository.

## Systems

| System | Primary purpose | Existing dependency touchpoints | Shared API contracts | Integration points |
|---|---|---|---|---|
| `daxini.xyz` | Workspace shell, execution console, orchestration surface | `workspace/`, `src/router/`, `infra/` | `workspace.call`, `identity.token`, `telemetry.event`, `marketplace.publish` | Receives identity from Aporaksha, dispatches reasoning tasks to Zayvora, pushes telemetry to Hanuman |
| `zayvora-toolkit` | Reasoning engine + thread execution runtime | `zayvora/`, `workspace/connectors/zayvora-toolkit.js` | `reason.run`, `thread.update`, `timeline.event` | Bound to workspace thread manager, emits timeline + memory graph events |
| `logichub.app` | Tool/app creation layer | `src/logichub/` | `build.artifact`, `publish.request` | Marketplace publishing pipeline into Daxini Space |
| `daxini.space` | Marketplace distribution surface | Adapter route in ecosystem router | `marketplace.publish`, `marketplace.url` | Accepts artifact publish events from LogicHub |
| `aporaksha` | Identity and ecosystem gateway | Adapter route in ecosystem router | `identity.token`, `identity.session` | Issues tokens for daxini.xyz route context |
| `hanuman.solutions` | Security telemetry + threat intelligence | `security/`, `security/telemetry-ingest.js` | `telemetry.ingest`, `telemetry.dashboard` | Receives events from all domains for blocked attacks, region, threat type stats |

## Cross-system routing topology

1. `aporaksha -> daxini.xyz`: identity token handoff through `identity.token` route.
2. `daxini.xyz -> zayvora-toolkit`: workspace calls through `workspace.call` route.
3. `logichub.app -> daxini.space`: marketplace publishing via `marketplace.publish` route.
4. `hanuman.solutions -> all`: security telemetry fan-in through `telemetry.event` route.

## Memory graph model (`/memory/global-graph`)

Node classes registered globally:
- `tasks`
- `apps`
- `repos`
- `users`
- `articles`

Each subsystem can push standardized events:
- `node.registered`
- `thread.created`
- `thread.status.updated`
- `timeline.step`
- `telemetry.ingested`
- `marketplace.published`

## Marketplace pipeline (`logichub -> daxini.space`)

Pipeline event sequence:
1. `build.artifact.generated`
2. `marketplace.publish.requested`
3. `marketplace.entry.created`
4. `marketplace.url.assigned`

## Deployment routing notes

`infra/ecosystem-router.js` centralizes route forwarding by route key, validates payload basics, and forwards events to target adapters. Adapters are injected to keep the router environment-agnostic (browser, edge, or server).
