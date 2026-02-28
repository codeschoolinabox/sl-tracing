/**
 * @file Limit exceeded error class.
 *
 * Thrown when execution exceeds configured limits (steps, time, iterations).
 */

import EmbodyError from './embody-error.js';

/**
 * Thrown when execution exceeds configured limits.
 *
 * @example
 * ```typescript
 * try {
 *   await trace('js', 'while(true) {}', { meta: { maxSteps: 1000 } });
 * } catch (error) {
 *   if (error instanceof LimitExceededError) {
 *     console.log(error.limit);  // 'steps'
 *     console.log(error.actual); // 1001
 *   }
 * }
 * ```
 */
class LimitExceededError extends EmbodyError {
  override readonly name = '(EmbodyError) LimitExceededError' as const;
  readonly limit: string;
  readonly actual: number;

  constructor(message: string, limit: string, actual: number, options?: ErrorOptions) {
    super(message, options);
    this.limit = limit;
    this.actual = actual;
  }
}

export default LimitExceededError;
