/**
 * @file Base error class for all embody errors.
 *
 * Exists only for `instanceof` catch-all — never thrown directly.
 * All embody errors extend this class, enabling consumers to catch
 * any library error with a single check.
 */

/**
 * Base class for all embody errors.
 *
 * Use `instanceof EmbodyError` to catch any error from the embody library
 * while letting non-library errors propagate.
 *
 * @example
 * ```typescript
 * try {
 *   const steps = await trace('chars', code);
 * } catch (error) {
 *   if (error instanceof EmbodyError) {
 *     showUserError(error.message);
 *   } else {
 *     throw error;
 *   }
 * }
 * ```
 */
class EmbodyError extends Error {
  override readonly name: string = 'EmbodyError';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export default EmbodyError;
