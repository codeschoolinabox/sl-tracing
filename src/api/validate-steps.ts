/**
 * @file Tracer output validation.
 *
 * Validates that `record()` returns an array conforming to the `StepCore`
 * contract. Called after record() and before freezing — the trust boundary
 * between tracer code and consumer code.
 */

import StepsInvalidError from '../errors/steps-invalid-error.js';
import type { StepCore } from '../types.js';
import isPlainObject from '../utils/is-plain-object.js';

/**
 * Asserts that `steps` satisfies the `StepCore[]` contract.
 * Collects all violations before throwing so tracer developers see every
 * problem at once.
 *
 * @param steps - The value returned by `tracerModule.record()`
 * @throws {StepsInvalidError} if the output is not a valid `StepCore[]`
 *
 * @remarks
 * Runs in the post-processing phase, after `record()` returns and before
 * `deepFreeze`. Checks structural conformity only — array of plain objects
 * with 1-indexed `step` field and valid `loc` (ESTree SourceLocation).
 * Extra tracer-specific fields are allowed.
 */
function validateSteps(steps: unknown): asserts steps is readonly StepCore[] {
  // 1. Must be an array — fail fast, can't check elements otherwise
  if (!Array.isArray(steps)) {
    throw new StepsInvalidError([
      `expected record() to return an array, got ${typeof steps}`,
    ]);
  }

  // eslint-disable-next-line functional/prefer-readonly-type -- mutable accumulator; readonly would block .push()
  const violations: string[] = [];

  // 2. Check each element for StepCore conformity
  for (const [index, element] of steps.entries()) {
    checkStep(violations, index, element);
  }

  if (violations.length > 0) {
    throw new StepsInvalidError(violations);
  }
}

export default validateSteps;

// ============================================================================
// File-private helpers (hoisted below for readability per convention)
// ============================================================================

/** Validates a single step element at `steps[index]`. */
function checkStep(violations: string[], index: number, element: unknown): void {
  const prefix = `steps[${String(index)}]`;

  if (!isPlainObject(element)) {
    violations.push(`${prefix}: expected plain object, got ${typeof element}`);
    return;
  }

  checkStepField(violations, prefix, element.step, index);
  checkLocField(violations, prefix, element.loc);
}

/** Validates the `step` field: must be a number, 1-indexed, sequential. */
function checkStepField(
  violations: string[],
  prefix: string,
  value: unknown,
  index: number,
): void {
  const expected = index + 1;

  if (typeof value !== 'number') {
    violations.push(`${prefix}.step: expected number, got ${typeof value}`);
  } else if (value !== expected) {
    violations.push(
      `${prefix}.step: expected ${String(expected)} (1-indexed), got ${String(value)}`,
    );
  }
}

/** Validates the `loc` field: must be a SourceLocation with start and end. */
function checkLocField(
  violations: string[],
  prefix: string,
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    violations.push(`${prefix}.loc: expected object with start and end positions`);
    return;
  }

  checkPosition(violations, `${prefix}.loc.start`, value.start);
  checkPosition(violations, `${prefix}.loc.end`, value.end);
}

/** Validates a position object: { line: number >= 1, column: number >= 0 }. */
function checkPosition(
  violations: string[],
  path: string,
  value: unknown,
): void {
  if (!isPlainObject(value)) {
    violations.push(`${path}: expected object with line and column`);
    return;
  }

  if (typeof value.line !== 'number' || value.line < 1) {
    violations.push(`${path}.line: expected number >= 1, got ${String(value.line)}`);
  }

  if (typeof value.column !== 'number' || value.column < 0) {
    violations.push(`${path}.column: expected number >= 0, got ${String(value.column)}`);
  }
}
