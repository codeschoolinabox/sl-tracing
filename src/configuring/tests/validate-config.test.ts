/**
 * @file Tests for validateConfig function.
 */

import OptionsInvalidError from '../../errors/options-invalid-error.js';
import type { JSONSchema } from '../types.js';
import validateConfig from '../validate-config.js';

/** Test schema for validation */
const testSchema: JSONSchema = {
  type: 'object',
  properties: {
    direction: {
      type: 'string',
      enum: ['lr', 'rl'],
    },
    remove: {
      type: 'array',
    },
    count: {
      type: 'integer',
    },
  },
  required: ['direction'],
  additionalProperties: false,
};

describe('validateConfig', () => {
  describe('valid input', () => {
    it('returns data unchanged for valid input', () => {
      const input = { direction: 'lr', remove: [] };

      const result = validateConfig(input, testSchema);

      expect(result).toEqual(input);
    });

    it('returns same reference (enables piping)', () => {
      const input = { direction: 'rl' };

      const result = validateConfig(input, testSchema);

      expect(result).toBe(input);
    });
  });

  describe('invalid type', () => {
    it('throws OptionsInvalidError for wrong type', () => {
      const input = { direction: 123 };

      expect(() => validateConfig(input, testSchema)).toThrow(OptionsInvalidError);
    });

    it('error message includes field path', () => {
      const input = { direction: 123 };

      expect(() => validateConfig(input, testSchema)).toThrow(/direction/);
    });
  });

  describe('invalid enum', () => {
    it('throws for invalid enum value', () => {
      const input = { direction: 'invalid' };

      expect(() => validateConfig(input, testSchema)).toThrow(OptionsInvalidError);
    });

    it('error message lists allowed values', () => {
      const input = { direction: 'invalid' };

      expect(() => validateConfig(input, testSchema)).toThrow(/lr|rl/);
    });
  });

  describe('missing required field', () => {
    it('throws when required field is missing', () => {
      const input = { remove: [] };

      expect(() => validateConfig(input, testSchema)).toThrow(OptionsInvalidError);
    });

    it('error message mentions the missing field', () => {
      const input = { remove: [] };

      expect(() => validateConfig(input, testSchema)).toThrow(/direction/);
    });
  });

  describe('collects all errors', () => {
    it('reports multiple validation errors', () => {
      const input = { direction: 123, count: 'not a number' };

      try {
        validateConfig(input, testSchema);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(OptionsInvalidError);
        const { message } = error as Error;
        expect(message).toMatch(/direction/);
        expect(message).toMatch(/count/);
      }
    });
  });

  describe('edge cases', () => {
    it('validates empty object against schema without required', () => {
      const schemaNoRequired: JSONSchema = {
        type: 'object',
        properties: {
          optional: { type: 'string' },
        },
      };

      const result = validateConfig({}, schemaNoRequired);

      expect(result).toEqual({});
    });

    it('handles null/undefined input as empty object', () => {
      const schemaNoRequired: JSONSchema = {
        type: 'object',
        properties: {},
      };

      expect(validateConfig(null, schemaNoRequired)).toEqual({});
      expect(validateConfig(undefined, schemaNoRequired)).toEqual({});
    });
  });
});
