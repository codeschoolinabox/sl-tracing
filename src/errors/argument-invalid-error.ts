/**
 * @file Argument invalid error class.
 *
 * Thrown when required function arguments have wrong type or value.
 */

import EmbodyError from './embody-error.js';

/**
 * Thrown when required function arguments have wrong type or value.
 *
 * @example
 * ```typescript
 * try {
 *   await trace(123, 'code'); // tracer should be string
 * } catch (error) {
 *   if (error instanceof ArgumentInvalidError) {
 *     console.log(error.field); // 'tracer'
 *   }
 * }
 * ```
 */
class ArgumentInvalidError extends EmbodyError {
  override readonly name = '(EmbodyError) ArgumentInvalidError' as const;
  readonly field: string;

  constructor(field: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.field = field;
  }
}

export default ArgumentInvalidError;
