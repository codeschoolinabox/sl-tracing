/**
 * @file Options invalid error class.
 *
 * Thrown when user-provided options (or meta) don't match the JSON Schema.
 */

import TracingError from './tracing-error.js';

/**
 * Thrown when options or meta don't match the JSON Schema.
 *
 * @example
 * ```typescript
 * try {
 *   await trace('chars', 'ab', { options: { direction: 'invalid' } });
 * } catch (error) {
 *   if (error instanceof OptionsInvalidError) {
 *     console.log(error.path); // 'options.direction'
 *   }
 * }
 * ```
 */
class OptionsInvalidError extends TracingError {
  override readonly name = '(TracingError) OptionsInvalidError' as const;
  readonly path: string | undefined;

  constructor(message: string, path?: string, options?: ErrorOptions) {
    super(message, options);
    this.path = path;
  }
}

export default OptionsInvalidError;
