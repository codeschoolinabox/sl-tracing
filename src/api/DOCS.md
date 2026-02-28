# api — Architecture Notes

Rationale for the 2x2 design, cache invalidation, and validation timing.
For API signatures and usage, see the TSDoc comments in each source file.

---

## The 2x2 Matrix

|            | Simple                     | Chainable                    |
| ---------- | -------------------------- | ---------------------------- |
| **Throws** | `trace(code, config?)`     | `tracify.code().steps`       |
| **Safe**   | `embody({ code, config })` | `embodify({ code }).trace()` |

Four wrappers rather than one because the two axes are genuinely independent trade-offs:

**Throws vs Safe**: The error-handling model is a project-level decision. A quick script
wants errors to propagate. A production UI wants `{ ok, error }` without try-catch. One
API forces that choice on the consumer.

**Simple vs Chainable**: The state-building pattern depends on call-site context. Chainable
APIs are better when you build config across multiple call sites or re-trace with modified
state. Simple APIs are better for one-shot calls. Mixing them into one API
(e.g., embody with `.then()` chaining) creates an inconsistent mental model.

### Why Not Classes?

OOP classes (Tracer, Embodier) were the original embody API. Eliminated for:

- **State mutation bugs**: mutable setters make call order matter implicitly
- **`this` binding footguns**: methods extracted as callbacks break
- **Testability**: harder to assert on immutable snapshots vs. mutable instance state
- **Functional constraint**: codebase bans `class` and `this` as a convention (ESLint enforced)

The chainable functional APIs (`tracify`, `embodify`) provide the same builder pattern
with immutable state transitions.

---

## Cache Invalidation Design

`tracify` and `embodify` cache `resolvedConfig` and `steps` to avoid redundant work.

### What Invalidates What

| Value Changed | Invalidates `steps` | Invalidates `resolvedConfig` | Why                                                      |
| ------------- | ------------------- | ---------------------------- | -------------------------------------------------------- |
| `tracer`      | Yes                 | Yes                          | Different tracer = different schema = different defaults |
| `code`        | Yes                 | No                           | Same config, different input                             |
| `config`      | Yes                 | Yes                          | Config changed, defaults may differ                      |
| Nothing       | No                  | No                           | Identity equality check prevents spurious invalidation   |

### `langs`-Aware Code Retention on Tracer Change

When the tracer changes, code is retained or cleared based on language compatibility:

- `newTracer.langs.length === 0` OR `state.tracer.langs.length === 0` → keep code
  (at least one is universal — accepts any language)
- `newTracer.langs` intersects `state.tracer.langs` → keep code (same language family)
- No intersection → clear code (incompatible language families)

**Why**: Switching from `js:klve` to a hypothetical `ts:klve` with the same JS/TS code
should retain the code. Switching from `js:klve` to `txt:chars` should not — a JS snippet
is not meaningful text-character input.

### Config Is Always Cleared on Tracer Change

Even `meta` (universal execution limits) is cleared when tracer changes. Simplicity:
config is an atomic unit — no partial state. To preserve meta explicitly:

```typescript
const oldMeta = chain.resolvedConfig?.meta;
const chain2 = chain.tracer(newTracer).config({ meta: oldMeta });
```

---

## Validation Timing

```text
validateTracerModule(tracerModule)   ← at tracing() call — TracerInvalidError
│
├── ArgumentInvalidError             ← sync, on each wrapper call (wrong arg types)
│
└── at .steps / .trace() / completing embody() call:
      prepareConfig(meta, metaSchema)      → OptionsInvalidError
      prepareConfig(options, schema)       → OptionsInvalidError
      tracerModule.verifyOptions?(options) → OptionsSemanticInvalidError
      tracerModule.record(code, config)    → ParseError | RuntimeError | LimitExceededError
```

**Why validate tracer at `tracing()` and not lazily?** The tracer contract is checked once,
upfront. All four wrappers share the same tracer object — validating it once avoids
redundant checks on every trace call.

**Why validate args sync?** Type errors are synchronous — the argument is wrong before any
async work starts. Throwing sync gives the consumer an immediate, clear stack trace.

**Why validate config lazily (at trace)?** Config may not be provided until trace time
(partial application, chainable setters). Validating eagerly would require passing config
to every setter method.

**Why does `validate-tracer-module.ts` live in `api/` not `errors/`?** `errors/` contains
error _classes_ only. `validateTracerModule` is validation _logic_ that happens to throw one
of those classes — a different concern. All four API wrappers call it at their entry points,
making `api/` its natural home.

---

## Error Ownership

| Error                         | Thrown By                  | When                                     |
| ----------------------------- | -------------------------- | ---------------------------------------- |
| `TracerInvalidError`          | `tracing()`                | TracerModule contract violated           |
| `ArgumentInvalidError`        | Each wrapper               | Wrong arg types (`code`, `config`)       |
| `OptionsInvalidError`         | `/configuring`             | meta/options fail JSON Schema validation |
| `OptionsSemanticInvalidError` | Tracer's `verifyOptions()` | Cross-field constraints violated         |
| `ParseError`                  | Tracer's `record()`        | Code cannot be parsed                    |
| `RuntimeError`                | Tracer's `record()`        | Execution fails during tracing           |
| `LimitExceededError`          | Tracer's `record()`        | Execution limit exceeded                 |

---

## Links

- [API Overview](./README.md) — 2x2 matrix, quick start, decision guide
- [Config Module](../configuring/DOCS.md) — pure validation pipeline rationale
- [Cross-Cutting Architecture](../DOCS.md) — layer stack, immutability principle
