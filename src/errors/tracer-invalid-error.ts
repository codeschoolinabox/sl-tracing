/**
 * @file Tracer invalid error class.
 *
 * Thrown when a value passed as a TracerModule fails shape validation.
 * Replaces TracerUnknownError (which assumed a registry).
 */

import EmbodyError from './embody-error.js';

/**
 * Thrown when a value does not satisfy the `TracerModule` contract.
 *
 * All violations are collected before throwing, so consumers see every
 * problem in one pass rather than fixing one and encountering the next.
 *
 * @remarks
 * Thrown by `validateTracerModule()` and thus by every API entry point
 * (`tracing()`, `trace()`, `tracify.tracer()`, `embody()`, `embodify()`).
 *
 * @example
 * ```typescript
 * try {
 *   tracing({ id: 'missing-record' } as unknown as TracerModule);
 * } catch (error) {
 *   if (error instanceof TracerInvalidError) {
 *     console.log(error.violations); // ['record must be a function']
 *   }
 * }
 * ```
 */
class TracerInvalidError extends EmbodyError {
  override readonly name = '(EmbodyError) TracerInvalidError' as const;
  readonly violations: readonly string[];

  constructor(violations: readonly string[], options?: ErrorOptions) {
    super(`Invalid TracerModule: ${violations.join('; ')}`, options);
    this.violations = violations;
  }
}

export default TracerInvalidError;
