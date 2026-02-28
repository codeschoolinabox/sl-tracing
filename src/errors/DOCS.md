# errors — Architecture Notes

Rationale for error class design and ownership model.
For error class interfaces and usage examples, see TSDoc in each source file.

---

## Why a Base Class?

`EmbodyError` exists purely as a marker for `instanceof` catch-all:

```typescript
if (error instanceof EmbodyError) {
  // Any tracing error — handle gracefully
} else {
  throw error; // Not our error — propagate
}
```

Without it, consumers must list every error class in their catch. The base class makes
the distinction trivial and robust against new error classes being added.

`EmbodyError` is never thrown directly — only subclasses are.

---

## Why `instanceof` Instead of `.code` Properties?

- **Tree-shakeable**: Import only the errors you catch
- **TypeScript-narrows**: `instanceof` narrows the type, giving access to class-specific
  properties (`error.violations`, `error.loc`, `error.limit`, etc.)
- **Architecture-visible**: An import of `TracerInvalidError` in a tracer package is a
  visible code smell — tracers shouldn't be catching tracer-validation errors

---

## `TracerInvalidError` — Aggregate Design

`TracerInvalidError` collects all `TracerModule` contract violations before throwing.
One throw, complete feedback:

```typescript
throw new TracerInvalidError([
  'id must be a non-empty string',
  'langs must be an array of strings',
  'record must be a function',
]);
```

**Why aggregate?** When a tracer package author gets `TracerInvalidError` during
development, they see all problems at once instead of fixing one and re-running to find
the next. Compare `OptionsInvalidError`, which also collects multiple Ajv errors.

**Why not `AggregateError`?** `AggregateError` wraps `Error[]`. Our violations are
validation messages, not thrown errors. A `violations: string[]` property is both
simpler and more usable (`error.violations.join('\n')`).

`TracerInvalidError` replaces the former `TracerUnknownError`. There is no registry —
tracers are passed as objects — so "unknown tracer" is no longer a possible failure mode.
The only failure mode is a malformed `TracerModule` object, which `TracerInvalidError` covers.

---

## Error Ownership Table

| Error                         | Tier        | Consumer Action                         |
| ----------------------------- | ----------- | --------------------------------------- |
| `TracerInvalidError`          | Dev-time    | Fix TracerModule — not user-facing      |
| `ArgumentInvalidError`        | Dev-time    | Fix call site — not user-facing         |
| `OptionsInvalidError`         | User-facing | Show schema error, fix config           |
| `OptionsSemanticInvalidError` | User-facing | Show constraint error                   |
| `ParseError`                  | User-facing | Show location, highlight line           |
| `RuntimeError`                | User-facing | Show execution error                    |
| `LimitExceededError`          | User-facing | Prompt to raise limits or simplify code |
| `InternalError`               | Bug         | Report to maintainers                   |

**Two error tiers:**

- **Dev-time errors** (`TracerInvalidError`, `ArgumentInvalidError`): Indicate bugs in
  tool/tracer code, not user input. No need to surface to end users.
- **User-facing errors** (everything else): Indicate problems with user-provided code or
  configuration. Surface the message and location to the user.

---

## Links

- [Error Overview](./README.md) — hierarchy, quick start, file structure
- [Cross-Cutting Architecture](../DOCS.md) — layer stack
