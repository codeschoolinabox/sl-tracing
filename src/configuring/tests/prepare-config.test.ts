/**
 * @file Tests for prepareConfig wrapper function.
 */

import OptionsInvalidError from '../../errors/options-invalid-error.js';
import prepareConfig from '../prepare-config.js';
import type { JSONSchema } from '../types.js';

/** Test schema with shorthand support and defaults */
const testSchema: JSONSchema = {
  type: 'object',
  properties: {
    direction: {
      type: 'string',
      enum: ['lr', 'rl'],
      default: 'lr',
    },
    remove: {
      type: 'array',
      default: [],
    },
    allowedCharClasses: {
      type: 'object',
      properties: {
        lowercase: { type: 'boolean', default: true },
        uppercase: { type: 'boolean', default: true },
        number: { type: 'boolean', default: true },
      },
      default: { lowercase: true, uppercase: true, number: true },
    },
  },
  required: ['direction'],
};

describe('prepareConfig', () => {
  describe('full pipeline', () => {
    it('expands shorthand, fills defaults, and validates in one call', () => {
      const input = { allowedCharClasses: false };

      const result = prepareConfig(input, testSchema);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        allowedCharClasses: {
          lowercase: false,
          uppercase: false,
          number: false,
        },
      });
    });

    it('returns fully-filled options from partial input', () => {
      const input = { direction: 'rl' };

      const result = prepareConfig(input, testSchema);

      expect(result).toEqual({
        direction: 'rl',
        remove: [],
        allowedCharClasses: { lowercase: true, uppercase: true, number: true },
      });
    });
  });

  describe('preserves user values', () => {
    it('preserves user values through pipeline', () => {
      const input = {
        direction: 'rl',
        remove: ['x', 'y'],
        allowedCharClasses: { lowercase: true, uppercase: false, number: true },
      };

      const result = prepareConfig(input, testSchema);

      expect(result).toEqual(input);
    });
  });

  describe('validation errors', () => {
    it('throws OptionsInvalidError for invalid input', () => {
      const input = { direction: 'invalid' };

      expect(() => prepareConfig(input, testSchema)).toThrow(OptionsInvalidError);
    });

    it('throws after attempting to fill defaults', () => {
      // Invalid type that can't be coerced
      const input = { direction: { nested: 'object' } };

      expect(() => prepareConfig(input, testSchema)).toThrow(OptionsInvalidError);
    });
  });

  describe('edge cases', () => {
    it('handles null input gracefully', () => {
      const result = prepareConfig(null, testSchema);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        allowedCharClasses: { lowercase: true, uppercase: true, number: true },
      });
    });

    it('handles undefined input gracefully', () => {
      const result = prepareConfig(undefined, testSchema);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        allowedCharClasses: { lowercase: true, uppercase: true, number: true },
      });
    });

    it('handles empty object input', () => {
      const result = prepareConfig({}, testSchema);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        allowedCharClasses: { lowercase: true, uppercase: true, number: true },
      });
    });
  });
});
