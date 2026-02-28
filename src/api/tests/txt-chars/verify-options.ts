/**
 * @file Semantic validation for chars options.
 *
 * Called by API layer AFTER structural validation and default-filling.
 * Constraint is artificial (for testing), but exercises the semantic
 * validation error path.
 */

import OptionsSemanticInvalidError from '../../../errors/options-semantic-invalid-error.js';

import type { CharsOptions } from './types.js';

/**
 * Semantic validation for chars options.
 *
 * Artificial constraint: if maxLength is set, it must be greater than
 * remove.length. Rationale: can't limit output to fewer chars than
 * you're already removing.
 *
 * @param options - Fully-filled options (never partial, never undefined fields)
 * @throws OptionsSemanticInvalidError if constraints violated
 */
function verifyOptions(options: CharsOptions): void {
  if (options.maxLength !== undefined && options.maxLength < options.remove.length) {
    const message =
      `maxLength (${options.maxLength}) must be greater than ` +
      `remove.length (${options.remove.length})`;
    throw new OptionsSemanticInvalidError(message);
  }
}

export default verifyOptions;
