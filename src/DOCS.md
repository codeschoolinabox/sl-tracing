# src — Architecture & Decisions

TODO: explain the module structure — why these directories exist and how they relate.

## Module boundaries

The ESLint `boundaries` plugin enforces a DAG between modules. See `eslint.config.js`
for the full dependency graph. In short:

- `utils/` has no internal dependencies (leaf node)
- TODO: describe other boundary rules for your specific modules

## Why no barrel files?

Importing directly from source files (no `index.ts` re-exports except at package entry)
keeps the dependency graph explicit and prevents accidental coupling. The `boundaries`
plugin enforces this.
