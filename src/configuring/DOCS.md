# configuring — Architecture Notes

Rationale for the pure pipeline design, schema agnosticism, and verifyOptions convention.
For function signatures and usage examples, see TSDoc in each source file.

---

## Why Pure Functions?

Each function in this module is pure: `(data, schema) → data`. No side effects, no
state, no awareness of which tracer is being validated.

**Benefits:**

- Pipeable: `validateConfig(fillDefaults(expandShorthand(data, schema), schema), schema)`
- Independently testable
- Usable for both `meta` and `options` without modification
- No coupling to tracer registry or API layer

**The API layer does the coordination**: it knows which schema to pass (from
`TracerModule.optionsSchema`) and in what order to call things.

---

## Why Schema-Agnostic?

These functions receive `schema` as a parameter. They never import from `/tracers`,
never look up tracer IDs, and never know which tracer they're serving.

This means the same `prepareConfig` call works for both:

```typescript
const meta = prepareConfig(userMeta ?? {}, metaSchema); // cross-language limits
const options = prepareConfig(userOptions ?? {}, tracerSchema); // tracer-specific options
```

If `/configuring` knew about tracers, adding a new tracer would require changes here.
This way, adding a tracer only requires writing `optionsSchema` — nothing else changes.

---

## Pipeline Order: expand → fill → validate

The order matters:

1. **`expandShorthand`** first: converts `{ field: false }` to the full object shape
   before defaults are filled. Without this, boolean shorthand would fail validation.

2. **`fillDefaults`** second: applies schema `default` values for missing fields. Must
   happen before validation so required fields (which have defaults) don't fail.

3. **`validateConfig`** last: confirms the fully-expanded, defaults-filled data matches
   the schema. At this point, the data should be complete.

---

## `verifyOptions` Convention

Tracers MAY export a `verifyOptions(options: unknown): void` function for semantic
validation — cross-field constraints that JSON Schema cannot express.

**The API layer calls it — not `/configuring`.**

```typescript
// In each API wrapper (after prepareConfig):
tracerModule.verifyOptions?.(filledOptions); // optional call
```

This keeps `/configuring` tracer-agnostic. The convention is documented here because
it's the continuation of the validation pipeline, even though it lives outside this module.

```typescript
// In a tracer package:
function verifyOptions(options: MyOptions): void {
  if (options.strict && options.lenient) {
    throw new OptionsSemanticInvalidError('strict and lenient are mutually exclusive');
  }
}
```

---

## `meta-schema.ts` Wrapper Pattern

`meta.schema.json` is the canonical schema (works with external JSON Schema tooling).
`meta-schema.ts` wraps it:

```typescript
import raw from './meta.schema.json' with { type: 'json' };
export default deepFreezeInPlace(raw as JSONSchema);
```

Internal code always imports from `meta-schema.ts` — never from `meta.schema.json` directly.
This gives TypeScript the `JSONSchema` type and ensures the schema is frozen at import time.

---

## Links

- [Module Overview](./README.md) — purpose, pipeline, what this module does NOT do
- [API Architecture Notes](../api/DOCS.md) — how config flows through the full pipeline
