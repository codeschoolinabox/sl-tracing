# utils — Architecture Notes

## Freeze Utility Ownership Model

Two freeze utilities with distinct semantics. Never interchange them.

### `deepFreeze` — For Objects We Don't Own

Use when the object came from outside: user config, steps from `tracer.record()`.

- Clones first, then freezes the clone
- Returns a new reference — caller's original is untouched
- **Never call on objects containing functions.** `deepClone` was designed for full
  serializability — it converts functions to `{ type: 'function', name: '...', stringified: '...' }`
  metadata objects instead of passing them through. The function is gone. This is not a
  limitation of freezing itself (`Object.freeze({ fn: () => {} })` works fine) — it's
  `deepClone`'s specific design choice. Use `deepFreezeInPlace` instead.

```typescript
const frozenSteps = deepFreeze(steps); // tracer owns steps — clone + freeze
const frozenConfig = deepFreeze(userConfig); // user owns config — clone + freeze
```

### `deepFreezeInPlace` — For Objects We Just Built

Use when you constructed the object yourself in this scope.

- Freezes the same reference in place (no clone)
- Returns the same reference — identity is preserved
- Safe on objects containing functions
- **Never call on chain objects.** `EmbodifyChain` and `TracifyChain` have getters with
  side effects. Recursive traversal via `Object.values()` triggers those getters, which
  throw when required state (tracer, code) is missing.

```typescript
// resolvedConfig is fresh from prepareConfig() — we built it
const resolvedConfig = deepFreezeInPlace({ meta, options });

// tracer fixture assembled locally in test — we own it
export default deepFreezeInPlace({ id, langs, record, optionsSchema, verifyOptions });
```

### Shallow `Object.freeze` — For Chain Objects

`TracifyChain` and `EmbodifyChain` wrappers use `Object.freeze` (shallow only):

```typescript
// tracing.ts — shallow only (tracify/embodify chains are inside)
return Object.freeze({ trace, tracify, embody, embodify });

// chain factory — shallow only (stored values already individually frozen)
return Object.freeze({ tracer, code, config, steps, resolvedConfig, ok, error, ... });
```

### Application Table

| Location             | Object                                 | Utility                   | Why                                    |
| -------------------- | -------------------------------------- | ------------------------- | -------------------------------------- |
| All 4 wrappers       | Steps from `tracer.record()`           | `deepFreeze`              | Tracer owns them                       |
| All 4 wrappers       | `resolvedConfig = { meta, options }`   | `deepFreezeInPlace`       | Fresh from `prepareConfig()`           |
| `embody.ts`          | User config on entry                   | `deepFreeze`              | User owns it                           |
| `embody.ts`          | `EmbodyResult` wrapper                 | `deepFreezeInPlace`       | We just constructed it                 |
| `embodify.ts`        | User config stored internally          | `deepFreeze`              | User owns it                           |
| `tracing.ts`         | `{ trace, tracify, embody, embodify }` | `Object.freeze` (shallow) | Chains inside have getter side effects |
| `txt-chars/index.ts` | TracerModule fixture                   | `deepFreezeInPlace`       | We assembled it locally                |

### Why Two Separate Files

Distinct semantics → distinct import sites → the ownership decision is visible in the code.
No shared internal helper between the two files — each is standalone and independently clear.

### `deepIsFrozen` Is Intentionally Absent

Only useful for test assertions. `Object.isFrozen()` on specific nested properties is
sufficient for test coverage, and that's a one-liner at the call site.
