/**
 * @file Internal error class.
 *
 * Thrown for unexpected internal errors (bugs, invariant violations).
 * Wraps the original error in the cause property.
 */

import EmbodyError from './embody-error.js';

/**
 * Thrown for unexpected internal errors.
 *
 * When caught, the original error (if any) is available in the `cause` property.
 * These errors typically indicate bugs in embody that should be reported.
 *
 * @example
 * ```typescript
 * try {
 *   await trace('chars', 'code');
 * } catch (error) {
 *   if (error instanceof InternalError) {
 *     console.log(error.message); // "Unexpected error during tracing"
 *     console.log(error.cause);   // Original error object
 *   }
 * }
 * ```
 */
class InternalError extends EmbodyError {
  override readonly name = '(EmbodyError) InternalError' as const;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export default InternalError;
