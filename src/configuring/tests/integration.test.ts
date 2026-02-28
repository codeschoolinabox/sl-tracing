/**
 * @file Integration tests for the configuring module.
 *
 * Tests the full pipeline and verifies individual functions are pipeable.
 */

import expandShorthand from '../expand-shorthand.js';
import fillDefaults from '../fill-defaults.js';
import prepareConfig from '../prepare-config.js';
import type { JSONSchema } from '../types.js';
import validateConfig from '../validate-config.js';

/** Realistic chars schema for integration testing */
const charsSchema: JSONSchema = {
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
    allowedCharClasses: {
      type: 'object',
      properties: {
        lowercase: { type: 'boolean', default: true },
        uppercase: { type: 'boolean', default: true },
        number: { type: 'boolean', default: true },
        punctuation: { type: 'boolean', default: true },
        other: { type: 'boolean', default: true },
      },
      default: {
        lowercase: true,
        uppercase: true,
        number: true,
        punctuation: true,
        other: true,
      },
    },
  },
  required: ['direction', 'remove', 'replace', 'allowedCharClasses'],
};

describe('configuring integration', () => {
  describe('prepareConfig handles full pipeline', () => {
    it('expands boolean shorthand for all-boolean object fields', () => {
      const input = { allowedCharClasses: false };

      const result = prepareConfig(input, charsSchema);

      expect(result).toMatchObject({
        allowedCharClasses: {
          lowercase: false,
          uppercase: false,
          number: false,
          punctuation: false,
          other: false,
        },
      });
    });

    it('fills all defaults for empty input', () => {
      const result = prepareConfig({}, charsSchema);

      expect(result).toEqual({
        direction: 'lr',
        remove: [],
        replace: {},
        allowedCharClasses: {
          lowercase: true,
          uppercase: true,
          number: true,
          punctuation: true,
          other: true,
        },
      });
    });

    it('preserves user values while filling missing defaults', () => {
      const input = {
        direction: 'rl',
        allowedCharClasses: { lowercase: false, uppercase: true },
      };

      const result = prepareConfig(input, charsSchema);

      expect(result).toMatchObject({
        direction: 'rl',
        remove: [],
        replace: {},
      });
    });
  });

  describe('functions are individually pipeable', () => {
    it('manual piping produces same result as wrapper', () => {
      const input = { direction: 'rl', allowedCharClasses: false };

      const manual = validateConfig(
        fillDefaults(expandShorthand(input, charsSchema), charsSchema),
        charsSchema,
      );
      const wrapped = prepareConfig(input, charsSchema);

      expect(manual).toEqual(wrapped);
    });

    it('each function returns options object enabling chaining', () => {
      const input = { allowedCharClasses: true };

      const afterExpand = expandShorthand(input, charsSchema);
      expect(afterExpand).toBeDefined();
      expect(typeof afterExpand).toBe('object');

      const afterFill = fillDefaults(afterExpand, charsSchema);
      expect(afterFill).toBeDefined();
      expect(typeof afterFill).toBe('object');

      const afterValidate = validateConfig(afterFill, charsSchema);
      expect(afterValidate).toBeDefined();
      expect(typeof afterValidate).toBe('object');
    });
  });

  describe('immutability across pipeline', () => {
    it('original input unchanged after full pipeline', () => {
      const input = { direction: 'rl', allowedCharClasses: false };
      const originalInput = { direction: 'rl', allowedCharClasses: false };

      prepareConfig(input, charsSchema);

      expect(input).toEqual(originalInput);
    });
  });

  describe('error propagation', () => {
    it('validation errors propagate through prepareConfig', () => {
      const input = { direction: 'invalid' };

      expect(() => prepareConfig(input, charsSchema)).toThrow(/direction/);
    });
  });
});
