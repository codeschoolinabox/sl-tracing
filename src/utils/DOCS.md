# utils — Architecture & Decisions

## Why these utilities exist

JavaScript's built-in object tools (`Object.assign`, spread, `Object.freeze`) are all
shallow. This module fills that gap for immutable-style programming with nested data.
`structuredClone` was deliberately avoided — it's browser-incompatible in older targets
and throws on non-serializable values (functions, class instances).

## deepFreeze vs deepFreezeInPlace

Two freeze utilities exist for different ownership semantics:

- **`deepFreeze`**: clones first, then freezes the clone. Use when you don't own the
  source (caller-provided data). The caller's object is untouched.
- **`deepFreezeInPlace`**: freezes the original in place — no clone, no copy. Use only
  on objects you just built, before any reference escapes. The exception to the "pure
  functions" rule: this mutation is intentional and safe because it happens before the
  object has been shared.

## Why arrays are replaced in deepMerge

Element-by-element array merging is ambiguous (merge by index? by value? by key?).
Replacing arrays wholesale is unambiguous and matches the most common use case
(overriding a list of items in config).

## Circular reference handling

`deepClone` uses a `WeakMap` to track visited objects and throws on cycles.
`deepEqual` tracks visited pairs (not just objects) to correctly handle two distinct
circular structures that happen to be structurally equal.
