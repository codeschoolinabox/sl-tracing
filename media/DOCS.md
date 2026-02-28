# src — Architecture Notes

Architecture decisions that span multiple subdirectories. For per-module rationale, see each
module's own `DOCS.md`.

---

## Layer Stack

```text
utils → errors → configuring → api → tracing → entry
```

Each layer may only import from layers below it. Enforced by `eslint-plugin-boundaries` as errors.

| Layer         | File/Dir             | May Import From                                 |
| ------------- | -------------------- | ----------------------------------------------- |
| `entry`       | `src/index.ts`       | tracing, api, configuring, errors, types, utils |
| `tracing`     | `src/tracing.ts`     | api, configuring, errors, types, utils          |
| `api`         | `src/api/**`         | configuring, errors, types, utils               |
| `configuring` | `src/configuring/**` | errors, utils                                   |
| `errors`      | `src/errors/**`      | types                                           |
| `utils`       | `src/utils/**`       | utils (siblings only)                           |
| `types`       | `src/types.ts`       | (nothing — pure type definitions)               |

### Why `tracing.ts` Is Its Own Layer

`src/tracing.ts` sits between `api` and `entry` as its own boundary element rather than
being folded into either. It imports from `api` (calls individual wrappers to get pre-bound
versions) but is not itself the entry point. This keeps `entry` (`index.ts`) free of
business logic — it only re-exports.

If `tracing.ts` were merged into `entry`, the entry point would have logic. If merged into
`api/`, it would be a file in `api/` that imports from `api/` siblings — no obvious nesting.
Standing alone as a boundary element is the cleanest split.

### Why `types.ts` Lives at `src/` Root

`types.ts` defines `TracerModule`, `StepCore`, `MetaConfig`, etc. — types needed by
multiple layers (`api`, `errors`, `entry`). A circular dependency would result if these
lived inside any single layer's directory. Placing them at root with their own boundary
element (`types`) avoids the cycle.

`utils` and `configuring` don't import from `types.ts` — they operate on `unknown` or
primitive values and have no need for domain types.

---

## Immutability at API Boundaries

Every object crossing an API boundary is deeply frozen. This prevents consumer mutation
bugs — vibecoded tools can't accidentally corrupt shared state.

### Two Utilities, Two Ownership Models

| Utility             | File                            | When to Use                                                   |
| ------------------- | ------------------------------- | ------------------------------------------------------------- |
| `deepFreeze`        | `utils/deep-freeze.ts`          | Objects we **don't own** (user config, tracer output)         |
| `deepFreezeInPlace` | `utils/deep-freeze-in-place.ts` | Objects we **just built** (`resolvedConfig`, result wrappers) |

See `src/utils/DOCS.md` for the full ownership model with application table.

### The `deepFreeze`+Functions Footgun

`deepFreeze` clones via `deepClone`, which was designed for full serializability and
converts functions to metadata objects `{ type: 'function', name: '...', stringified: '...' }`
rather than passing them through. (This is not a freezing limitation — `Object.freeze`
itself handles functions fine. It's `deepClone`'s specific design choice.) Never call
`deepFreeze` on objects that contain functions. Use `deepFreezeInPlace` instead.

### The Chain Object Footgun

`deepFreezeInPlace` and `deepFreeze` both traverse `Object.values()` recursively. Chain
objects (`TracifyChain`, `EmbodifyChain`) have getter properties with side effects — they
throw when required state (tracer, code) is missing. Use shallow `Object.freeze` for chain
wrapper objects only. Each nested value is already individually frozen when stored.

### Freeze Once, Return As-Is

Freeze at the point of creation or receipt. After that, return the frozen object directly
on every subsequent access — never re-clone or re-freeze. Getters in `tracify` and
`embodify` return stored frozen values as-is.
