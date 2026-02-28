/**
 * @file Tests for expandShorthand function.
 */

import expandShorthand from '../expand-shorthand.js';
import type { JSONSchema } from '../types.js';

/** Test schema with boolean shorthand support */
const schemaWithBooleanObject: JSONSchema = {
  type: 'object',
  properties: {
    direction: {
      type: 'string',
      enum: ['lr', 'rl'],
    },
    allowedCharClasses: {
      type: 'object',
      properties: {
        lowercase: { type: 'boolean' },
        uppercase: { type: 'boolean' },
        number: { type: 'boolean' },
      },
    },
    remove: {
      type: 'array',
    },
  },
};

describe('expandShorthand', () => {
  describe('no shorthand present', () => {
    it('returns unchanged when field is already an object', () => {
      const input = {
        allowedCharClasses: { lowercase: true, uppercase: false, number: true },
      };

      const result = expandShorthand(input, schemaWithBooleanObject);

      expect(result).toEqual(input);
    });

    it('returns unchanged when field is not boolean-expandable', () => {
      const input = { direction: 'rl', remove: ['a', 'b'] };

      const result = expandShorthand(input, schemaWithBooleanObject);

      expect(result).toEqual(input);
    });
  });

  describe('boolean shorthand expansion', () => {
    it('expands false to all-false object', () => {
      const input = { allowedCharClasses: false };

      const result = expandShorthand(input, schemaWithBooleanObject);

      expect(result).toEqual({
        allowedCharClasses: {
          lowercase: false,
          uppercase: false,
          number: false,
        },
      });
    });

    it('expands true to all-true object', () => {
      const input = { allowedCharClasses: true };

      const result = expandShorthand(input, schemaWithBooleanObject);

      expect(result).toEqual({
        allowedCharClasses: {
          lowercase: true,
          uppercase: true,
          number: true,
        },
      });
    });
  });

  describe('preserves other fields', () => {
    it('preserves non-expandable fields alongside expanded ones', () => {
      const input = {
        direction: 'rl',
        allowedCharClasses: false,
        remove: ['x'],
      };

      const result = expandShorthand(input, schemaWithBooleanObject);

      expect(result).toEqual({
        direction: 'rl',
        allowedCharClasses: {
          lowercase: false,
          uppercase: false,
          number: false,
        },
        remove: ['x'],
      });
    });
  });

  describe('immutability', () => {
    it('returns new object (does not mutate input)', () => {
      const input = { allowedCharClasses: false };

      const result = expandShorthand(input, schemaWithBooleanObject);

      expect(result).not.toBe(input);
      expect(input.allowedCharClasses).toBe(false);
    });

    it('returns new object even when no expansion occurs', () => {
      const input = { direction: 'lr' };

      const result = expandShorthand(input, schemaWithBooleanObject);

      expect(result).not.toBe(input);
      expect(result).toEqual(input);
    });
  });

  describe('edge cases', () => {
    it('handles undefined options gracefully', () => {
      const result = expandShorthand(undefined, schemaWithBooleanObject);

      expect(result).toEqual({});
    });

    it('handles null options gracefully', () => {
      const result = expandShorthand(null, schemaWithBooleanObject);

      expect(result).toEqual({});
    });

    it('handles empty options object', () => {
      const result = expandShorthand({}, schemaWithBooleanObject);

      expect(result).toEqual({});
    });

    it('handles schema without properties', () => {
      const emptySchema: JSONSchema = { type: 'object' };
      const input = { anything: false };

      const result = expandShorthand(input, emptySchema);

      expect(result).toEqual({ anything: false });
    });

    it('does not expand when schema property has mixed types', () => {
      const mixedSchema: JSONSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              count: { type: 'number' },
            },
          },
        },
      };
      const input = { config: false };

      const result = expandShorthand(input, mixedSchema);

      expect(result).toEqual({ config: false });
    });
  });
});
