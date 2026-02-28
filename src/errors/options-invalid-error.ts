/**
 * @file Options invalid error class.
 *
 * Thrown when user-provided options (or meta) don't match the JSON Schema.
 */

import EmbodyError from './embody-error.js';

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
class OptionsInvalidError extends EmbodyError {
  override readonly name = '(EmbodyError) OptionsInvalidError' as const;
  readonly path: string | undefined;

  constructor(message: string, path?: string, options?: ErrorOptions) {
    super(message, options);
    this.path = path;
  }
}

export default OptionsInvalidError;
