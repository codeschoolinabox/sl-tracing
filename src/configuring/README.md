# configuring/

Pure utility functions for options validation and default-filling.

This module provides stateless functions that validate options against JSON Schema and fill
defaults. It has **no coordination responsibility** — the API layer imports schemas and calls
these functions.

## Purpose

Before this module existed, each tracer duplicated default values, merge logic, and structural
validation. This didn't scale — adding a new tracer meant copy-pasting validation boilerplate.

**Solution**: Extract validation and default-filling into pure, reusable functions. Tracers
export JSON Schema; API layer calls these functions with the schema.

## Architectural Principle

`/configuring` is a **collection of pure functions** with **NO coordination responsibility**.

| What it is          | What it is NOT               |
| ------------------- | ---------------------------- |
| Pure functions      | A coordinating layer         |
| Stateless utilities | A registry or lookup service |
| Schema-agnostic     | Tracer-aware                 |

```typescript
// Functions take (data, schema) — no tracerId, no registry lookup
const filled = prepareConfig(userOptions, schema);
```

**Module isolation**: `/configuring` imports ONLY from `/errors`. It never imports from
`/api`, `/tracers`, or any external layer above it.

## The Pipeline

```text
expand → fill → validate
```

| Function          | Purpose                                  | Returns                        |
| ----------------- | ---------------------------------------- | ------------------------------ |
| `expandShorthand` | Expand boolean shorthand to full objects | New data object (never throws) |
| `fillDefaults`    | Fill missing fields from schema defaults | New data object (never throws) |
| `validateConfig`  | Validate against schema                  | Same data (throws on failure)  |
| `prepareConfig`   | Wrapper: runs all three in order         | Fully-filled, validated data   |

## What This Module Does NOT Do

- **Schema lookup**: API layer imports schemas directly from `TracerModule.optionsSchema`
- **Coordination**: API layer orchestrates the validation flow
- **Semantic validation**: Tracers export `verifyOptions()`, API layer calls it
- **Tracer/code validation**: API layer validates those
- **Parsing or tracing**: Tracer modules do that

## Dependencies

- **[Ajv](https://ajv.js.org/)** — JSON Schema validator with `useDefaults: true` and
  `coerceTypes: true`. `ajv.ts` handles CJS/ESM interop (ajv v7 is CJS-only).

## File Structure

```text
src/configuring/
  README.md             # This file
  DOCS.md               # Architecture rationale
  types.ts              # TypeScript types (JSONSchema)
  meta.schema.json      # Canonical JSON Schema for MetaConfig
  meta-schema.ts        # Frozen wrapper — internal import point for meta schema
  ajv.ts                # CJS/ESM interop — resolves Ajv constructor
  expand-shorthand.ts   # expandShorthand(data, schema)
  fill-defaults.ts      # fillDefaults(data, schema)
  validate-config.ts    # validateConfig(data, schema)
  prepare-config.ts     # prepareConfig(data, schema) — wrapper
  tests/
    ajv.test.ts
    expand-shorthand.test.ts
    fill-defaults.test.ts
    validate-config.test.ts
    prepare-config.test.ts
    integration.test.ts
```

**Schema wrapper pattern**: `meta.schema.json` is the canonical JSON Schema (compatible with
external validators and IDE plugins). `meta-schema.ts` imports it, deep-freezes via
`deepFreezeInPlace`, and re-exports as a typed `JSONSchema`. Internal code always imports
the frozen wrapper — never the raw JSON.

## Links

- [Architecture Rationale](./DOCS.md) — pipeline design, verifyOptions convention
- [API Module](../api/README.md) — how API layer coordinates validation
