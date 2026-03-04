/**
 * @file Tracer invalid error class.
 *
 * Thrown when a value passed as a TracerModule fails shape validation.
 * Replaces TracerUnknownError (which assumed a registry).
 */

import TracingError from './tracing-error.js';

/**
 * Thrown when a value does not satisfy the `TracerModule` contract.
 *
 * All violations are collected before throwing, so consumers see every
 * problem in one pass rather than fixing one and encountering the next.
 *
 * @remarks
 * Thrown by `validateTracerModule()` and thus by every API entry point
 * (`tracing()`, `trace()`, `embody.tracer()`, `tracify()`, `embodify()`).
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
class TracerInvalidError extends TracingError {
  override readonly name = '(TracingError) TracerInvalidError' as const;
  readonly violations: readonly string[];

  constructor(violations: readonly string[], options?: ErrorOptions) {
    super(`Invalid TracerModule: ${violations.join('; ')}`, options);
    this.violations = violations;
  }
}

export default TracerInvalidError;
