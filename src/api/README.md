# api/

Four API wrappers for the 2x2 matrix. See [DOCS.md](./DOCS.md) for architecture rationale.

## The 2x2 Matrix

|            | Simple (positional/keyed args) | Chainable (builder pattern) |
| ---------- | ------------------------------ | --------------------------- |
| **Throws** | `trace`                        | `tracify`                   |
| **Safe**   | `embody`                       | `embodify`                  |

**Throws** = error propagates as exception. **Safe** = error returned as `{ ok: false, error }`.

**Simple** = pass all args at once (positional or keyed). **Chainable** = build up state via
method calls, trigger trace separately.

All four wrappers are pre-bound to a `TracerModule` by `tracing()`. Consumers use them
without passing a tracer each time.

## Quick Start

```typescript
import tracing from '@study-lenses/tracing';
import myTracer from '@study-lenses/trace-js-klve';

const { trace, tracify, embody, embodify } = tracing(myTracer);

// Simplest — trace with positional args
const steps = await trace(code, config);

// Chainable throws — build up then await .steps
const steps = await tracify.code(code).config(config).steps;

// Safe keyed — returns { ok, steps } or { ok, error }
const result = await embody({ code, config });
if (result.ok) console.log(result.steps);

// Safe chainable — .set() is sync, .trace() is async
const chain = await embodify({ code }).set({ config }).trace();
if (chain.ok) console.log(chain.steps);
```

## Decision Guide

| Need                                     | Use        | Why                                          |
| ---------------------------------------- | ---------- | -------------------------------------------- |
| Quick script, errors can propagate       | `trace`    | Simplest, positional args                    |
| Build config gradually, throw on error   | `tracify`  | Chainable, memoized `.steps`                 |
| Production code, explicit error handling | `embody`   | `{ ok, error }`, smart partial application   |
| Error recovery, re-trace after failure   | `embodify` | `.set()` returns new chain, `.trace()` again |
| Partial application — reuse same code    | `embody`   | Closure caches provided fields               |
| Inspect state before tracing             | `embodify` | Lazy `.resolvedConfig`, sync getters         |

## Config Flow

```text
User config (partial)
  → prepareConfig(meta, metaSchema)        ← /configuring
  → prepareConfig(options, optionsSchema)  ← /configuring
  → tracerModule.verifyOptions?(options)   ← tracer's semantic validator
  → tracerModule.record(code, { meta, options })
  → readonly StepCore[]
```

Tracers receive fully-filled, validated config — never partial, never invalid types.

## File Structure

```text
src/api/
  trace.ts                  # Positional, throws: trace(code, config?) → Promise<StepCore[]>
  tracify.ts                # Chainable throws: .code().config().steps
  embody.ts                 # Keyed, safe: { code, config } → Promise<EmbodyResult>
  embodify.ts               # Chainable safe: .set().trace() → Promise<EmbodifyChain>
  validate-tracer-module.ts # API input guard — validates TracerModule, throws TracerInvalidError
  types.ts                  # Wrapper-specific types: EmbodyResult, TracifyChain, EmbodifyChain, etc.
  tests/
    trace.test.ts
    tracify.test.ts
    embody.test.ts
    embodify.test.ts
    validate-tracer-module.test.ts  # validateTracerModule tests
    reverse.ts       # Test fixture: universal tracer (langs: [])
    reverse-txt.ts   # Test fixture: txt-only tracer (langs: ['txt'])
    txt-chars/       # Reference tracer fixture (txt:chars implementation)
  README.md          # This file
  DOCS.md            # Architecture rationale
```

## Links

- [Architecture Rationale](./DOCS.md) — 2x2 design decisions, cache invalidation, validation timing
- [Config Module](../configuring/README.md) — how options are validated and filled
- [Error Module](../errors/README.md) — which errors each wrapper throws
