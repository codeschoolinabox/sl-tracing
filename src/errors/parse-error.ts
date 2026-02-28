/**
 * @file Parse error class.
 *
 * Thrown when code cannot be parsed by a tracer's record() function.
 * Includes source location (line and column) where parsing failed.
 */

import EmbodyError from './embody-error.js';
import type { SourceLoc } from './types.js';

/**
 * Thrown when code cannot be parsed.
 *
 * The `loc` property provides the source location where parsing failed,
 * enabling editors to highlight the error position.
 *
 * @example
 * ```typescript
 * try {
 *   await trace('chars', 'code with ‽ interrobang');
 * } catch (error) {
 *   if (error instanceof ParseError) {
 *     console.log(`${error.loc.line}:${error.loc.column}: ${error.message}`);
 *   }
 * }
 * ```
 */
class ParseError extends EmbodyError {
  override readonly name = '(EmbodyError) ParseError' as const;
  readonly loc: SourceLoc;

  constructor(message: string, loc: SourceLoc, options?: ErrorOptions) {
    super(message, options);
    this.loc = loc;
  }
}

export default ParseError;
