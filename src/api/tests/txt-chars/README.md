# Chars Language Module

A minimal test language for architecture validation. Treats any string as a sequence of characters and produces one step per character.

## Purpose

Chars exists to validate the multi-language tracer architecture without the complexity of real language parsing. It's useful for:

- Testing registry routing
- Validating StepCore contract compliance
- Integration testing without language-specific edge cases
- Quick prototyping of new features

## Exports

| Export          | Type        | Required | Description                     |
| --------------- | ----------- | -------- | ------------------------------- |
| `tracerId`      | string      | Yes      | `'chars'`                       |
| `record`        | Function    | Yes      | Character traversal tracer      |
| `optionsSchema` | JSON Schema | Yes      | Options validation and defaults |
| `verifyOptions` | Function    | Yes      | Semantic validation             |

## Configuration

Options are validated and filled by [`/configuring`](../../configuring/README.md) before reaching `record`.

```typescript
type CharsOptions = {
  readonly remove: readonly string[]; // Characters to exclude from steps
  readonly replace: Readonly<Record<string, string>>; // Character substitutions
  readonly direction: 'lr' | 'rl'; // Traversal direction
  readonly allowedCharClasses: AllowedCharClasses; // Which character classes to include
};

type CharClass = 'lowercase' | 'uppercase' | 'number' | 'punctuation' | 'other';
type AllowedCharClasses = { readonly [K in CharClass]: boolean };
```

### Schema Defaults

```json
{
  "remove": [],
  "replace": {},
  "direction": "lr",
  "allowedCharClasses": {
    "lowercase": true,
    "uppercase": true,
    "number": true,
    "punctuation": true,
    "other": true
  }
}
```

### Character Classes

Characters are classified into these categories:

| Class         | Pattern           | Examples            |
| ------------- | ----------------- | ------------------- |
| `lowercase`   | `[a-z]`           | a, b, z             |
| `uppercase`   | `[A-Z]`           | A, B, Z             |
| `number`      | `[0-9]`           | 0, 5, 9             |
| `punctuation` | `[!-/:-@[-\`{-~]` | !, @, #, $, %, ...  |
| `other`       | everything else   | spaces, newlines, ü |

Set a class to `false` to exclude all characters in that class from output.

**Shorthand**: Pass `true` or `false` instead of the full object to enable/disable all classes at once. Expanded by `/configuring` before reaching `record`.

See [`options.schema.json`](./options.schema.json) for the full JSON Schema (internal code uses the frozen wrapper [`options-schema.ts`](./options-schema.ts)).

### Contract

The `record` function receives **fully-filled options** — all fields present, all types validated. No defensive coding needed.

## Error Triggers

`record` and `verifyOptions` throw typed errors for testing the error pipeline:

| Error Class                   | Trigger                             | Source          |
| ----------------------------- | ----------------------------------- | --------------- |
| `ParseError`                  | Input contains interrobang (`‽`)    | `record`        |
| `RuntimeError`                | 3+ consecutive identical characters | `record`        |
| `LimitExceededError`          | Input exceeds `maxLength`           | `record`        |
| `LimitExceededError`          | Input exceeds `meta.max.steps`      | `record`        |
| `OptionsSemanticInvalidError` | `maxLength < remove.length`         | `verifyOptions` |

Check order in `record`: ParseError → RuntimeError → LimitExceededError.

These triggers are artificial — designed to exercise each error path in the architecture. See [`/errors`](../../errors/README.md) for error class details.

## Output

Each step includes:

```typescript
type CharsStep = {
  readonly step: number; // 1-indexed execution order
  readonly loc: {
    readonly start: { readonly line: 1; readonly column: number }; // 0-indexed column (ESTree)
    readonly end: { readonly line: 1; readonly column: number }; // 0-indexed column (ESTree)
  };
  readonly char: string; // Character at this position (after replacement)
};
```

## Examples

### Basic Traversal

```typescript
record('abc', { options: { remove: [], replace: {}, direction: 'lr' } });
// [
//   { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }, char: 'a' },
//   { step: 2, loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, char: 'b' },
//   { step: 3, loc: { start: { line: 1, column: 2 }, end: { line: 1, column: 2 } }, char: 'c' }
// ]
```

### Right-to-Left

```typescript
record('abc', { options: { remove: [], replace: {}, direction: 'rl' } });
// [
//   { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }, char: 'c' },
//   { step: 2, loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, char: 'b' },
//   { step: 3, loc: { start: { line: 1, column: 2 }, end: { line: 1, column: 2 } }, char: 'a' }
// ]
```

### Remove Filter

```typescript
record('abc', { options: { remove: ['b'], replace: {}, direction: 'lr' } });
// [
//   { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }, char: 'a' },
//   { step: 2, loc: { start: { line: 1, column: 2 }, end: { line: 1, column: 2 } }, char: 'c' }
// ]
// Note: step renumbered, column preserves original 0-indexed position
```

### Replace Filter

```typescript
record('abc', {
  options: { remove: [], replace: { a: 'x' }, direction: 'lr', allowedCharClasses: allTrue },
});
// [
//   { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }, char: 'x' },
//   { step: 2, loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, char: 'b' },
//   { step: 3, loc: { start: { line: 1, column: 2 }, end: { line: 1, column: 2 } }, char: 'c' }
// ]
```

### Character Class Filter

```typescript
// Only include lowercase letters (exclude uppercase and numbers)
record('aB1c', {
  options: {
    remove: [],
    replace: {},
    direction: 'lr',
    allowedCharClasses: {
      lowercase: true,
      uppercase: false,
      number: false,
      punctuation: true,
      other: true,
    },
  },
});
// [
//   { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }, char: 'a' },
//   { step: 2, loc: { start: { line: 1, column: 3 }, end: { line: 1, column: 3 } }, char: 'c' }
// ]
// Note: B at column 1 and 1 at column 2 are excluded (0-indexed)
```

## Files

| File                  | Purpose                           |
| --------------------- | --------------------------------- |
| `index.ts`            | Barrel: re-exports as named       |
| `tracer-id.ts`        | Tracer ID constant (`'chars'`)    |
| `record.ts`           | Core traversal logic              |
| `options.schema.json` | JSON Schema for options           |
| `options-schema.ts`   | Frozen wrapper for options schema |
| `verify-options.ts`   | Semantic validation               |
| `types.ts`            | CharsOptions, CharsStep types     |
| `README.md`           | This file                         |

## Links

- [Parent README](../README.md) — tracer module architecture
- [/configuring](../../configuring/README.md) — how options are validated
