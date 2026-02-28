/**
 * @file Runtime error class.
 *
 * Thrown when code execution fails during tracing.
 * Location is optional since runtime errors may not always have
 * a known source position.
 */

import EmbodyError from './embody-error.js';
import type { SourceLoc } from './types.js';

/**
 * Thrown when code execution fails during tracing.
 *
 * The `loc` property is optional — it may be undefined if the
 * error location cannot be determined (e.g., async stack traces).
 *
 * @example
 * ```typescript
 * try {
 *   await trace('js', 'throw new Error("boom")');
 * } catch (error) {
 *   if (error instanceof RuntimeError) {
 *     console.log(error.message); // "boom"
 *     if (error.loc) {
 *       console.log(`at line ${error.loc.line}`);
 *     }
 *   }
 * }
 * ```
 */
class RuntimeError extends EmbodyError {
  override readonly name = '(EmbodyError) RuntimeError' as const;
  readonly loc?: SourceLoc;

  constructor(message: string, loc?: SourceLoc, options?: ErrorOptions) {
    super(message, options);
    if (loc !== undefined) {
      this.loc = loc;
    }
  }
}

export default RuntimeError;
