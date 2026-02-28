/**
 * Tests for chars semantic option validation.
 *
 * verifyOptions() is called by API layer AFTER structural validation
 * and default-filling. It checks cross-field constraints.
 */

import OptionsSemanticInvalidError from '../../../../errors/options-semantic-invalid-error.js';
import txtCharsTracer from '../index.js';
import type { CharsOptions } from '../types.js';

const { verifyOptions } = txtCharsTracer;

/** Fully-filled options matching schema defaults */
const DEFAULT_OPTIONS: CharsOptions = {
  remove: [],
  replace: {},
  direction: 'lr',
};

/** Creates options with overrides merged over defaults */
function options(overrides: Partial<CharsOptions>): CharsOptions {
  return { ...DEFAULT_OPTIONS, ...overrides };
}

describe('verifyOptions', () => {
  describe('valid configurations', () => {
    it('accepts default options', () => {
      expect(() => verifyOptions(DEFAULT_OPTIONS)).not.toThrow();
    });

    it('accepts options without maxLength', () => {
      expect(() => verifyOptions(options({ remove: ['a', 'b'] }))).not.toThrow();
    });

    it('accepts maxLength greater than remove.length', () => {
      expect(() => verifyOptions(options({ maxLength: 5, remove: ['a', 'b'] }))).not.toThrow();
    });

    it('accepts maxLength equal to remove.length', () => {
      expect(() => verifyOptions(options({ maxLength: 2, remove: ['a', 'b'] }))).not.toThrow();
    });

    it('accepts maxLength with empty remove array', () => {
      expect(() => verifyOptions(options({ maxLength: 1 }))).not.toThrow();
    });
  });

  describe('semantic constraint: maxLength >= remove.length', () => {
    it('rejects when maxLength is less than remove.length', () => {
      expect(() => verifyOptions(options({ maxLength: 1, remove: ['a', 'b'] }))).toThrow(
        /maxLength.*must be greater than.*remove\.length/,
      );
    });

    it('throws OptionsSemanticInvalidError type', () => {
      expect(() => verifyOptions(options({ maxLength: 1, remove: ['a', 'b', 'c'] }))).toThrow(
        OptionsSemanticInvalidError,
      );
    });

    it('includes maxLength value in error message', () => {
      expect(() => verifyOptions(options({ maxLength: 2, remove: ['a', 'b', 'c'] }))).toThrow(/2/);
    });

    it('includes remove.length value in error message', () => {
      expect(() => verifyOptions(options({ maxLength: 1, remove: ['a', 'b', 'c'] }))).toThrow(/3/);
    });

    it('rejects maxLength of 0 with any remove entries', () => {
      expect(() => verifyOptions(options({ maxLength: 0, remove: ['a'] }))).toThrow(
        OptionsSemanticInvalidError,
      );
    });
  });
});
