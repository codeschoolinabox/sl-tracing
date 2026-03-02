/**
 * @file Steps invalid error class.
 *
 * Thrown when `record()` returns output that does not conform to the
 * `StepCore` contract. Indicates a bug in the tracer's `record()`
 * implementation, not a problem with user input.
 */

import EmbodyError from './embody-error.js';

/**
 * Thrown when tracer output does not satisfy the `StepCore` contract.
 *
 * All violations are collected before throwing, so tracer developers
 * see every problem in one pass rather than fixing one and encountering
 * the next. Same aggregate pattern as `TracerInvalidError`.
 *
 * @remarks
 * This is a dev-time error — it indicates a bug in the tracer's `record()`
 * function, not a problem with user-provided code or configuration. The
 * wrapper validates tracer output after `record()` returns, before freezing
 * and returning steps to the consumer.
 *
 * @example
 * ```typescript
 * try {
 *   const steps = await trace(code);
 * } catch (error) {
 *   if (error instanceof StepsInvalidError) {
 *     console.log(error.violations);
 *     // ['steps[0].step: expected 1 (1-indexed), got 0',
 *     //  'steps[1].loc.start: expected object with line and column']
 *   }
 * }
 * ```
 */
class StepsInvalidError extends EmbodyError {
  override readonly name = '(EmbodyError) StepsInvalidError' as const;
  readonly violations: readonly string[];

  constructor(violations: readonly string[], options?: ErrorOptions) {
    super(`Invalid tracer output: ${violations.join('; ')}`, options);
    this.violations = violations;
  }
}

export default StepsInvalidError;
