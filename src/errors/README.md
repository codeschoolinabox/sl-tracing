# errors/

Typed error classes for `@study-lenses/tracing`. Enables both catch-all handling
(`instanceof EmbodyError`) and specific handling (`instanceof ParseError`).

## Error Hierarchy

```text
Error (built-in)
  └── EmbodyError (marker class — never thrown directly)
        ├── TracerInvalidError           (tracing() — aggregate: violations[])
        ├── ArgumentInvalidError         (API layer — wrong arg types)
        ├── OptionsInvalidError          (/configuring — schema mismatch)
        ├── OptionsSemanticInvalidError  (tracer's verifyOptions)
        ├── ParseError                   (tracer's record — loc: SourceLoc)
        ├── RuntimeError                 (tracer's record — loc?: SourceLoc)
        ├── LimitExceededError           (tracer's record — limit, actual)
        └── InternalError                (any layer — cause?: Error)
```

## Error Ownership

| Error Class                   | Thrown By                | When                                     |
| ----------------------------- | ------------------------ | ---------------------------------------- |
| `TracerInvalidError`          | `tracing()`              | TracerModule contract violated           |
| `ArgumentInvalidError`        | API layer                | Required arguments have wrong type/value |
| `OptionsInvalidError`         | `/configuring`           | meta/options don't match JSON Schema     |
| `OptionsSemanticInvalidError` | Tracer's `verifyOptions` | Cross-field constraints violated         |
| `ParseError`                  | Tracer's `record`        | Code cannot be parsed                    |
| `RuntimeError`                | Tracer's `record`        | Execution fails during tracing           |
| `LimitExceededError`          | Tracer's `record`        | Execution limit exceeded                 |
| `InternalError`               | Any layer                | Unexpected internal error                |

## Quick Start

```typescript
import { EmbodyError, ParseError } from '@study-lenses/tracing';

try {
  const steps = await trace(code, config);
} catch (error) {
  if (error instanceof EmbodyError) {
    showUserError(error.message);
    if (error instanceof ParseError) {
      highlightLine(error.loc.line, error.loc.column);
    }
  } else {
    throw error; // Not our error — propagate
  }
}
```

## Convention Exception

This module uses `class` and `this` keywords, which are banned elsewhere in the codebase.
The standard JS pattern for extending `Error` requires a constructor and `this`. ESLint is
configured to allow `class`/`this` in `src/errors/**/*.ts`.

## File Structure

```text
src/errors/
  README.md                          # This file
  DOCS.md                            # Architecture rationale
  types.ts                           # Shared types (SourceLoc)
  embody-error.ts                    # Base class (marker only)
  tracer-invalid-error.ts            # tracing(): aggregate TracerModule violations
  argument-invalid-error.ts          # API: argument type/value invalid
  options-invalid-error.ts           # /configuring: schema mismatch
  options-semantic-invalid-error.ts  # tracer: semantic constraint violated
  parse-error.ts                     # tracer: parse failed
  runtime-error.ts                   # tracer: execution failed
  limit-exceeded-error.ts            # tracer: limit exceeded
  internal-error.ts                  # any: unexpected error
  tests/
    tracer-invalid-error.test.ts
    argument-invalid-error.test.ts
    ...
```

## Links

- [Architecture Rationale](./DOCS.md) — error ownership model, TracerInvalidError aggregate design
- [API Module](../api/README.md) — validation timing per wrapper
