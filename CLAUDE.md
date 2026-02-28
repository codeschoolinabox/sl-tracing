# Claude Assistant Context

This file provides specific context for AI assistants working with this `@study-lenses` package.

- [Project Overview](#project-overview)
- [Key Technical Context](#key-technical-context)
  - [Architecture](#architecture)
  - [Critical Conventions](#critical-conventions)
  - [Type System](#type-system)
  - [Testing Approach](#testing-approach)
  - [Linting Approach](#linting-approach)
  - [Incremental TDD Workflow](#incremental-tdd-workflow)
  - [Safety Guardrails](#safety-guardrails)
- [LLM Collaboration Conventions](#llm-collaboration-conventions)
- [References](#references)

## Project Overview

`@study-lenses/tracing` is the API wrapper infrastructure layer for the `@study-lenses`
ecosystem. It validates `TracerModule` objects and provides four standard API wrappers
(`trace`, `tracify`, `embody`, `embodify`) pre-bound to a tracer. Tracer packages
(`@study-lenses/trace-*`) depend on this package and expose these same four wrappers as
their public API — tracer developers only write the `record()` function.

**Key constraint**: This package contains NO tracing logic. No Aran, no Babel, no AST
instrumentation — all of that lives in tracer packages. This package validates the
`TracerModule` contract and composes the four wrappers around `tracerModule.record()`.

> **⚠️ Plan Mode First:** Discuss changes with Claude in plan mode before implementation.
> Exceptions: trivial fixes, user says "skip plan mode", or pure research tasks. Plan mode
> prevents wasted effort from misunderstandings and catches issues before code exists.

## Key Technical Context

### Architecture

```text
tracing(tracerModule)            ← default export; validates + pre-binds
  → validateTracerModule()       ← throws TracerInvalidError if contract violated
  → returns { trace, tracify, embody, embodify }

trace(code, config?)             ← positional, throws
tracify                          ← chainable builder, throws
embody({ code, config })         ← keyed args, returns { ok, steps, ... }
embodify({ ... })                ← keyed + chainable

Each wrapper:
  1. Validate + type-check args
  2. configuring/ → validate config against metaSchema, expand presets, fill defaults
  3. tracerModule.record(code, resolvedConfig) → steps
  4. Return steps (trace/tracify) or wrap in { ok, steps } (embody/embodify)
```

**Layer stack** (narrowest at the bottom — each layer can only import layers below it):

| Layer         | Path               | Responsibility                                                            |
| ------------- | ------------------ | ------------------------------------------------------------------------- |
| `entry`       | `src/index.ts`     | Public exports                                                            |
| `api`         | `src/api/`         | 4 wrappers + `tracing()` sugar                                            |
| `configuring` | `src/configuring/` | AJV schema validation, preset expansion, default-filling                  |
| `errors`      | `src/errors/`      | `EmbodyError` base + `TracerInvalidError`, `ArgumentInvalidError`, etc.   |
| `utils`       | `src/utils/`       | `deepClone`, `deepFreeze`, `deepMerge`, `deepEqual`, `isPlainObject`      |
| `testing`     | `src/testing/`     | Reference `txt:chars` tracer + `metaSchema` (export via `./testing` only) |

**`testing` isolation**: Production code (`entry`, `api`, `configuring`, `errors`, `utils`)
cannot import from `src/testing/`. The `testing` layer flows outward only via the
`./testing` export subpath, consumed by tracer packages in their test suites.

**Aran and Babel are NOT in this package** — they live in `@study-lenses/trace-*` tracer
packages. If you see an instrumentation import, it belongs in a tracer, not here.

### Critical Conventions

#### 1. Export Conventions

- **One default export per file**: Named function/const, then `export default` at bottom
- **No barrel files**: Import directly from source files (no `index.ts` re-exports except `/src/index.ts`)
- **Always `.js` extension** in imports

```javascript
// ✅ CORRECT
function myFunction() { ... }
export default myFunction;

// ❌ WRONG
export default function() { ... }  // inline default
export function myFunction() { ... }  // named export
import { x } from './index.js';  // barrel import
```

#### Type Location

Types live in `<module>/types.ts` with the code they document.

| Location                | Purpose                               |
| ----------------------- | ------------------------------------- |
| `src/<module>/types.ts` | Types for that module                 |
| `src/index.ts`          | Re-exports public types for consumers |

#### 2. Object-Threading Pattern

All pipeline functions follow this pattern:

```javascript
function stage(input) {
  const { existingData } = input;
  const newData = process(existingData);
  return { ...input, newData };
}
```

#### 3. Pure Functional Approach

- No mutations
- No side effects in core functions
- Explicit state passing
- Deterministic behavior

#### 4. Function Conventions

- Use named `function` declarations by default
- Arrow functions ONLY as anonymous inline callbacks: single expression, implicit return, readable at a glance
- Arrows NEVER assigned to variables (`const fn = () => ...` is banned)
- Non-trivial callbacks: extract as named `function` declarations, pass by name
- Hoisting encouraged: define helper functions below where they're first called

#### 5. No `this` Keyword

Banned. Exception: low-level code interfacing with libraries that require it.

#### 6. No Mutable Closures

Closures over mutable variables (`let`, reassigned bindings) are banned.
Closures over immutable values (cached config in currying) are fine.

#### 7. Method Shorthand in Objects

Use `{ process() {} }` not `{ process: function process() {} }`.

#### 8. Default Empty Object for Destructured Parameters

All destructured object params get `= {}` default:

```javascript
function processConfig({ preset = 'detailed' } = {}) {}
```

#### 9. Naming

- Functions: verb-first (`extractId`, `createConfig`, `isActive`)
- Predicates: prefix with `is`/`has`/`can`/`should`
- Callbacks: describe the transform (`extractId` not `mapUser`)

#### 10. Imports

- Always include `.js` extension
- Group: externals → internals → type imports (separated by blank lines)

#### 11. Types

- Prefer `type` over `interface`
- Types live in `types.ts` files per module

#### 12. Comments

- JSDoc for public functions (TypeDoc generates `docs/` from these)
- TSDoc `@remarks` for consumer-facing "why" context that belongs in generated docs
- Inline comments explain WHY, not WHAT
- No manual DOCS.md files — TypeDoc generates `docs/` automatically

#### 13. File Structure

- One concept per file, named after its default export
- `kebab-case` for all files and directories
- Unit tests in `tests/` subdirectory at the same level as source files
- Every source directory has a `README.md` (brief: what is this module, why does it exist)

#### 14. Prefer `const`

Use `let` only when reassignment is genuinely needed (loop counters, accumulators).

#### 15. Deep Freeze Return Values

Objects and arrays returned from functions MUST be deep frozen. This codebase is consumed by
LLMs that cannot be trusted not to mutate returned data.

- **`deepFreeze`**: For objects we don't own (caller-provided, external). Clones first, returns new frozen reference
- **`deepFreezeInPlace`**: For objects we just built (fresh results, config wrappers). Same reference, now frozen

**When to freeze**: Function return values, config objects, constants, shared defaults.

**Exception**: Performance-critical hot paths where profiling proves freeze overhead is
unacceptable. Must be documented with a `// perf: skip freeze — [reason]` comment.

> See DEV.md § Codebase Conventions for full rationale and examples.

### Readability Patterns

These patterns shape how code reads, not just what it does. See DEV.md § 12 for full examples.

**Guard-first, happy-path-last** — early returns for edge/error cases at the top; the happy
path sits uncluttered at the bottom. Works with the linter: deep nesting is a complexity
violation.

**Name intermediate values** — when a sub-expression has a clear identity, capture it in a
`const`. Name the thing, then use the name.

```typescript
const tracerModule = tracers[tracer];  // ✅ — named, then checked
if (!tracerModule) throw ...;
```

**Ternary: transparent value selection only** — both branches produce the same kind of thing;
the variable name captures the identity regardless of which path executes. When branches do
structurally different things, use `if-else`.

**Within-file helpers for readability; separate file for reuse** — extract a file-private
helper when it makes the main function read like a story (single use is fine). Extract to a
separate file only when the logic is used in 2+ places.

**WHY comments for non-obvious JS semantics** — when code relies on language mechanics that
aren't universally known, add a comment explaining WHY this approach is required.

```typescript
// typeof null === 'object' in JS — must explicitly exclude null
if (thing === null) return false;
```

**Numbered step comments for multi-phase functions** — when a function has distinct phases,
number them. Makes long functions skimmable without reading every line.

```typescript
// 1. Validate input (sync)
// 2. Prepare config (sync)
// 3. Execute (async)
```

**Blank lines as paragraph breaks** — separate distinct phases of logic. One blank line ends
one thought and starts the next. Group related statements; don't break every line.

### Documentation Convention

Two-audience split:

| Content                                    | Where                      | Audience     |
| ------------------------------------------ | -------------------------- | ------------ |
| API reference (signatures, params, throws) | TSDoc → `docs/`            | Consumers    |
| "Why" this API behaves this way            | TSDoc `@remarks` → `docs/` | Consumers    |
| "Why" this module/layer exists             | Directory `README.md`      | Contributors |
| Architecture diagrams                      | Root `README.md`           | Contributors |
| "Why" this internal impl decision          | Inline comment             | Code readers |

**Rules:**

- Every directory has a `README.md` (brief: what is this, why does it exist)
- Public functions have JSDoc/TSDoc in source; TypeDoc generates `docs/`
- No `DOCS.md` files anywhere — they go stale. `docs/` is gitignored, generated by CI
- Consumer-facing "why" context → TSDoc `@remarks` (appears in generated API docs)
- Module-level "why" context → directory `README.md`

### Available Utilities (src/utils/)

`src/utils/` ships with the template. These pure, browser-compatible helpers enable
immutable-style programming without needing a library or `structuredClone`. Reach for them
before writing your own.

| Utility             | Use when you need to...                                              |
| ------------------- | -------------------------------------------------------------------- |
| `deepClone`         | Copy any value recursively — Date, RegExp, Set, Map, circular refs   |
| `deepFreeze`        | Lock a value — returns a deeply frozen copy, original untouched      |
| `deepFreezeInPlace` | Lock a value in place — same reference, no clone, for objects we own |
| `deepMerge`         | Combine configs — user values override base, recursively, deep       |
| `deepEqual`         | Compare two values structurally — same type universe as `deepClone`  |
| `isPlainObject`     | Distinguish `{}` literals from class instances, arrays, null         |

```typescript
import deepClone from './utils/deep-clone.js';
import deepEqual from './utils/deep-equal.js';
import deepFreeze from './utils/deep-freeze.js';
import deepFreezeInPlace from './utils/deep-freeze-in-place.js';
import deepMerge from './utils/deep-merge.js';
import isPlainObject from './utils/is-plain-object.js';
```

Boundary constraint: `src/utils/` files can only import from other `src/utils/` files (enforced
by `eslint-plugin-boundaries`). See `src/utils/README.md` for examples.

### Type System

Full TypeScript strict mode. Types live with the code they document (`types.ts` per module).

### Testing Approach

See DEV.md § Testing Strategy for full conventions. Summary:

- Explicit vitest imports: `import { describe, it, expect } from 'vitest'` (no globals)
- Unit tests in `tests/` subdirectory (never alongside source files)
- File suffix: `.test.ts` (never `.spec.ts`)
- One assertion per `it`; nest `describe` blocks for grouping
- Direct description naming with implicit arrows for compactness
- Test ordering: feature → happy path → edge cases → errors → performance
- Inline test data only — no shared fixtures
- `.toThrow()` for errors — no try-catch patterns
- No comments — test names are documentation

### Linting Approach

See DEV.md § Linting Conventions for full details. Summary:

- **Three-tool pipeline**: ESLint (logic/patterns) + Prettier (formatting) + TypeScript (types)
- Most functional/import/style conventions auto-enforced via ESLint
- Pre-commit hooks run `lint:fix` and `format` on staged files
- Manual review for: default `= {}` params, verb-first naming, file granularity, comment quality
- Run `npm run validate` to check all three tools at once

### Incremental TDD Workflow

All development uses TDD with atomic increments. See DEV.md § Incremental Development Workflow
for the full process.

#### Claude-Specific Workflow Notes

**Plan constraints:**

- Plans MUST NOT include already-implemented functions — code is developed incrementally
- Plans start with a brief context line referencing completed work, then list ONLY unimplemented work
- **Plans describe BEHAVIOR, not code** — never include full implementations in plans. TDD discovers
  implementation
- Before starting work, verify understanding with the user: what will be built, what constraints
  apply, what success looks like
- Before writing any code, explain in plain language what you're about to do and why

**During TDD cycles:**

- Run lint checkpoints on specific modified files, not the whole codebase: `npm run lint <file>`
- At step 12 (self-review): Run through LLM Anti-Pattern Checklist. Reality check: did I run it?
  Did I trigger the exact behavior I changed? Would I bet $100 this works? Flag what you're least
  confident about for the user to review
- At step 13: Show actual output from quality checks — don't just claim "tests pass"

**Git prompts** (Claude prompts, user executes):

- Before a sprint: "Create a feature branch from main for this work"
- After each passing TDD cycle: "Ready for atomic commit: `add: [description]`"
- After the last increment: "Sprint complete — ready to push and open a PR or merge to main"

**Interrupt and redirect** if the user tries to skip planning, documentation, tests, or quality
checks — even if they insist.

#### Git: Humans Only

Claude MUST NOT run any git command that creates, modifies, or deletes history.

**Allowed** (read-only):

- `git status`, `git diff`, `git log`, `git show`, `git blame`, `git branch --list`

**Forbidden** (modifies history):

- `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git revert`,
  `git cherry-pick`, `git tag`, `git stash push/pop/drop`, `git commit --amend`, `git push --force`

**Instead:** Claude prompts the human for all git actions.

### Context Compaction Protocol

Long sessions hit context limits, triggering automatic summarization.

#### Trigger Mechanisms

**Proactive (Claude's judgment):**

- ~80% through estimated context window
- Long multi-file implementation sessions
- After 10+ incremental commits without break

**User-initiated:**

- User says `/checkpoint`, "context check", or similar

#### Compaction Preparation Checklist

When context is approaching capacity, Claude MUST:

1. **Update plan file** — capture current state, what's done, what's left
2. **Update docs** — ensure CLAUDE.md/DEV.md/README.md reflect current reality
3. **Prompt user to commit** — atomic checkpoint before compaction
4. **Summarize active context** — write session summary to plan file:
   - Current branch and recent commits
   - Files being modified
   - Open questions or blockers
   - Next immediate task
5. **Alert the user** with this format:

```text
⚠️ Context approaching capacity.

I've documented the current state:
- Plan file: [path]
- Branch: [current branch]
- Last commit: [summary]
- Next task: [what's next]

Ready for session handoff or continuation after compaction.
```

#### Post-Compaction Recovery

After context resets:

1. Re-read CLAUDE.md, DEV.md, relevant README.md files
2. Read plan file to restore session context
3. Verify understanding with user before resuming

### When Working on This Codebase

1. **Follow the Incremental TDD Workflow above** for all development work
2. Follow export conventions strictly (named-then-export, no barrels)
3. Import directly from source files (no barrel imports), always with `.js` extension
4. Maintain object-threading pattern where applicable
5. Keep functions pure and deterministic
6. Use named `function` declarations (arrows only for inline callbacks)
7. No `this` keyword, no mutable closures
8. Default empty object `= {}` on all destructured parameters
9. Verb-first naming; predicates prefixed with `is`/`has`/`can`/`should`
10. Prefer `type` over `interface`; types in `types.ts` files
11. Add TypeScript types for all public APIs
12. JSDoc/TSDoc for public functions; `@remarks` for consumer-facing "why"; inline comments for
    implementation "why"
13. No `DOCS.md` files — TypeDoc generates `docs/` automatically
14. Throw on invalid input; fail fast for critical errors
15. Place tests in `tests/` subdirectory, `.test.ts` suffix
16. Ensure `README.md` exists and is current in every directory you modify
17. Deep freeze all returned objects/arrays (`deepFreeze` for external, `deepFreezeInPlace` for freshly built)

### Safety Guardrails

Claude must actively protect the codebase — especially from its own worst tendencies.

#### Risk Assessment

Before starting any task involving multiple files, refactoring, cleanup, or architectural changes,
Claude must warn the user and push toward incremental breakdown. These patterns are especially
dangerous and must never be repeated:

- "Simplification" refactors that break working functionality
- Architectural rewrites that replace working systems with broken ones
- File deletion sprees that remove working code
- Over-abstraction that makes simple things complex
- Enthusiastic agreement to large changes without risk assessment

#### Emergency Brake

Work stops immediately if:

- Scope creeps beyond the original plan
- Test failures that aren't immediately understood
- Breaking changes to public APIs without explicit approval
- Claude catches itself skipping workflow steps

#### Intellectual Honesty

When Claude doesn't know something — say so explicitly, then suggest how to find out. Never guess
confidently. When stuck, say "I'm stuck" — asking for help is better than shipping broken code.

#### Defensive Development

Never edit a file without reading it first in the current session. Before changing existing code,
understand why it exists. When something breaks, revert to the last known working state and try
a different approach.

#### LLM Anti-Patterns (Resist These Tendencies)

| Anti-Pattern         | Rule                             | Example Fix                                     |
| -------------------- | -------------------------------- | ----------------------------------------------- |
| **Over-engineering** | Helper used once? Inline it      | `const x = getX(o)` → `const x = o.x`           |
| **Class addiction**  | Linter blocks, but check first   | `class X` → `function createX()`                |
| **Future-proofing**  | User didn't ask? Don't add it    | `options = {}` with unused fields → direct impl |
| **Defensive coding** | Validate at boundaries only      | Remove internal re-validation                   |
| **Verbose docs**     | Name + types explain? Skip JSDoc | Only document WHY or non-obvious contracts      |

##### Pre-Proposal Checklist

Before proposing code, answer YES to ALL:

- [ ] **Simplest solution?** Not most "elegant" or "extensible"
- [ ] **Only what requested?** No future-proofing, no "nice-to-haves"
- [ ] **Helpers used >1x?** If used once, inline it
- [ ] **Validate at boundaries only?** No re-validating internal calls
- [ ] **Junior-maintainable?** Understandable without explanation

## LLM Collaboration Conventions

### Code Organization for LLM Generation

The conventions in DEV.md are designed to help LLMs generate correct code on the first attempt:

- **Complete TypeScript types** prevent guessing field names/types
- **Predictable `kebab-case` filenames** enable discovery without searching
- **"Why" comments** signal intent that syntax can't convey
- **Self-documenting error messages** include context for debugging
- **Structural consistency** (imports → helpers → main → export) enables prediction

### Communication Discipline

- No false confidence: never claim something works without running it
- No sycophancy: never agree with an approach just because the user suggested it
- Express uncertainty with confidence levels ("~80% confident this is correct")
- When uncertain, investigate first rather than confirming assumptions
- Lead with problems and risks, not optimism

### Working with Claude

- Treat Claude as an iterative partner, not a one-shot solution
- Save your state (git commit) before letting Claude make large changes
- Core business logic needs close human oversight; peripheral features can run more autonomously

## References

- See DEV.md for architecture and code conventions
- See `src/` directory READMEs for module-specific context
- API documentation generated to `docs/` via `npm run docs`
