/**
 * @file Options semantic invalid error class.
 *
 * Thrown when options pass schema validation but violate cross-field constraints.
 */

import EmbodyError from './embody-error.js';

/**
 * Thrown when options violate semantic constraints.
 *
 * Used for cross-field constraints that cannot be expressed in JSON Schema,
 * such as mutually exclusive options or conditional requirements.
 *
 * @example
 * ```typescript
 * try {
 *   await trace('hypothetical', 'code', { options: { strict: true, lenient: true } });
 * } catch (error) {
 *   if (error instanceof OptionsSemanticInvalidError) {
 *     console.log(error.message); // "strict and lenient are mutually exclusive"
 *   }
 * }
 * ```
 */
class OptionsSemanticInvalidError extends EmbodyError {
  override readonly name = '(EmbodyError) OptionsSemanticInvalidError' as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export default OptionsSemanticInvalidError;
