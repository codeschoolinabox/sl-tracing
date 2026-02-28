/**
 * @file Tests for fillDefaults function.
 */

import fillDefaults from '../fill-defaults.js';
import type { JSONSchema } from '../types.js';

/** Test schema with various default values */
const schemaWithDefaults: JSONSchema = {
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
    replace: {
      type: 'object',
      default: {},
    },
    maxLength: {
      type: 'integer',
      description: 'Optional limit, no default',
    },
  },
};

/** Schema with nested object defaults */
const schemaWithNestedDefaults: JSONSchema = {
  type: 'object',
  properties: {
    config: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', default: true },
        level: { type: 'integer', default: 5 },
      },
      default: { enabled: true, level: 5 },
    },
  },
};

describe('fillDefaults', () => {
  describe('fills missing fields', () => {
    it('fills missing fields with defaults from schema', () => {
      const input = { direction: 'rl' };

      const result = fillDefaults(input, schemaWithDefaults);

      expect(result).toEqual({
        direction: 'rl',
        remove: [],
        replace: {},
      });
    });

    it('fills all fields when input is empty', () => {
      const result = fillDefaults({}, schemaWithDefaults);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        replace: {},
      });
    });
  });

  describe('preserves user values', () => {
    it('preserves user-provided values over defaults', () => {
      const input = {
        direction: 'rl',
        remove: ['a', 'b'],
        replace: { x: 'y' },
      };

      const result = fillDefaults(input, schemaWithDefaults);

      expect(result).toEqual(input);
    });

    it('preserves optional fields without defaults', () => {
      const input = { direction: 'lr', maxLength: 100 };

      const result = fillDefaults(input, schemaWithDefaults);

      expect(result).toHaveProperty('maxLength', 100);
    });
  });

  describe('type coercion', () => {
    it('coerces string to number when schema expects integer', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          count: { type: 'integer', default: 0 },
        },
      };
      const input = { count: '5' };

      const result = fillDefaults(input, schema);

      expect(result).toEqual({ count: 5 });
    });

    it('coerces string to boolean when schema expects boolean', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: false },
        },
      };
      const input = { enabled: 'true' };

      const result = fillDefaults(input, schema);

      expect(result).toEqual({ enabled: true });
    });
  });

  describe('removes unknown properties', () => {
    it('removes properties not in schema silently', () => {
      const schema: JSONSchema = {
        type: 'object',
        properties: {
          known: { type: 'string', default: 'default' },
        },
        additionalProperties: false,
      };
      const input = { known: 'value', unknown: 'should be removed' };

      const result = fillDefaults(input, schema);

      expect(result).toEqual({ known: 'value' });
      expect(result).not.toHaveProperty('unknown');
    });
  });

  describe('handles nested defaults', () => {
    it('fills nested object with defaults', () => {
      const input = {};

      const result = fillDefaults(input, schemaWithNestedDefaults);

      expect(result).toEqual({
        config: { enabled: true, level: 5 },
      });
    });

    it('preserves partial nested user values', () => {
      const input = { config: { enabled: false } };

      const result = fillDefaults(input, schemaWithNestedDefaults);

      expect(result).toEqual({
        config: { enabled: false, level: 5 },
      });
    });
  });

  describe('immutability', () => {
    it('returns new object (does not mutate input)', () => {
      const input = { direction: 'rl' };
      const originalInput = { ...input };

      const result = fillDefaults(input, schemaWithDefaults);

      expect(result).not.toBe(input);
      expect(input).toEqual(originalInput);
    });
  });

  describe('edge cases', () => {
    it('handles undefined options gracefully', () => {
      const result = fillDefaults(undefined, schemaWithDefaults);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        replace: {},
      });
    });

    it('handles null options gracefully', () => {
      const result = fillDefaults(null, schemaWithDefaults);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        replace: {},
      });
    });

    it('handles empty schema gracefully', () => {
      const emptySchema: JSONSchema = { type: 'object' };
      const input = { anything: 'value' };

      const result = fillDefaults(input, emptySchema);

      expect(result).toEqual({ anything: 'value' });
    });
  });
});
