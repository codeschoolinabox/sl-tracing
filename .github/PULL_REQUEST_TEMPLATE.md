## Summary

<!-- What does this PR do? 1-3 bullet points. -->

## Changes

<!-- Key files changed and why. -->

## Code Review Checklist

### Automated (ESLint + TypeScript)

- [ ] `npm run validate` passes with no errors

### Manual Review

- [ ] Named function/const, then `export default` at bottom
- [ ] Direct imports from source files (no barrel imports), always with `.js` extension
- [ ] Named `function` declarations (arrows only for inline single-expression callbacks)
- [ ] No `this` keyword, no mutable closures
- [ ] Default empty object `= {}` on all destructured parameters
- [ ] Verb-first naming; predicates prefixed with `is`/`has`/`can`/`should`
- [ ] Tests in `tests/` subdirectory (not alongside source files), `.test.ts` suffix
- [ ] One assertion per `it`; nested `describe` for grouping
- [ ] JSDoc on public functions; inline comments explain "why" not "what"
- [ ] Every modified directory has `README.md`
- [ ] No future-proofing or "nice-to-haves" beyond what was requested
