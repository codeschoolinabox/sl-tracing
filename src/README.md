# src/

Source files for `@study-lenses/tracing`.

## Root-Level Files

| File         | Purpose                                                                            |
| ------------ | ---------------------------------------------------------------------------------- |
| `index.ts`   | Entry point — re-exports everything public                                         |
| `tracing.ts` | `tracing()` sugar — validates TracerModule, returns 4 pre-bound wrappers           |
| `types.ts`   | Domain types shared across layers (`TracerModule`, `StepCore`, `MetaConfig`, etc.) |

## Subdirectories

| Directory                                 | Purpose                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| [`api/`](./api/README.md)                 | Four API wrappers: `trace`, `tracify`, `embody`, `embodify`                   |
| [`configuring/`](./configuring/README.md) | Pure config pipeline: shorthand expansion, default-filling, schema validation |
| [`errors/`](./errors/README.md)           | `EmbodyError` base class + all specific error classes                         |
| [`utils/`](./utils/README.md)             | Deep object utilities: clone, freeze, freeze-in-place, merge, equal           |
| `tests/`                                  | Integration tests for `tracing.ts`                                            |

See [DOCS.md](./DOCS.md) for layer stack architecture and cross-cutting decisions.
