/**
 * @file TracerModule shape validation.
 *
 * Single shared validation function used by every API entry point.
 * Collecting all violations before throwing gives developers complete
 * feedback in one shot.
 */

import TracerInvalidError from '../errors/tracer-invalid-error.js';
import type { TracerModule } from '../types.js';

/**
 * Asserts that `tracer` satisfies the `TracerModule` contract.
 * Collects all violations before throwing so callers see every problem at once.
 *
 * @param tracer - The value to validate (typically `unknown` from user input)
 * @throws {TracerInvalidError} if any contract field is missing or has the wrong shape
 *
 * @remarks
 * Validates shape only — not semantic correctness. Whether a tracer correctly
 * traces code is the tracer author's responsibility.
 *
 * Required fields: `id` (non-empty string), `langs` (string[]), `record` (function).
 * Optional fields: `optionsSchema` (plain object), `verifyOptions` (function).
 */
function validateTracerModule(tracer: unknown): asserts tracer is TracerModule {
  // Fast path: not even an object
  if (typeof tracer !== 'object' || tracer === null || Array.isArray(tracer)) {
    throw new TracerInvalidError(['tracerModule must be a plain object']);
  }

  const t = tracer as Record<string, unknown>;
  // eslint-disable-next-line functional/prefer-readonly-type -- mutable accumulator; readonly would block .push()
  const violations: string[] = [];

  if (typeof t.id !== 'string' || t.id.trim() === '') {
    violations.push('id must be a non-empty string');
  }

  if (
    !Array.isArray(t.langs) ||
    !(t.langs as readonly unknown[]).every((l) => typeof l === 'string')
  ) {
    violations.push('langs must be an array of strings (use [] for universal tracers)');
  }

  if (typeof t.record !== 'function') {
    violations.push('record must be a function');
  }

  if (
    t.optionsSchema !== undefined &&
    (typeof t.optionsSchema !== 'object' ||
      t.optionsSchema === null ||
      Array.isArray(t.optionsSchema))
  ) {
    violations.push('optionsSchema must be a plain object if provided');
  }

  if (t.verifyOptions !== undefined && typeof t.verifyOptions !== 'function') {
    violations.push('verifyOptions must be a function if provided');
  }

  if (violations.length > 0) {
    throw new TracerInvalidError(violations);
  }
}

export default validateTracerModule;
