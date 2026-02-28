/**
 * @file Tests for ajv CJS/ESM interop module.
 */

import Ajv from '../ajv.js';
import type { JSONSchema } from '../types.js';

const simpleSchema: JSONSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    count: { type: 'integer' },
  },
};

describe('ajv interop', () => {
  describe('constructor export', () => {
    it('exports a function', () => {
      expect(typeof Ajv).toBe('function');
    });

    it('creates instance with compile method', () => {
      const ajv = new Ajv();

      expect(typeof ajv.compile).toBe('function');
    });

    it('accepts allErrors option', () => {
      const ajv = new Ajv({ allErrors: true, strict: false });

      expect(ajv).toBeDefined();
    });

    it('accepts useDefaults and coerceTypes options', () => {
      const ajv = new Ajv({
        useDefaults: true,
        coerceTypes: true,
        removeAdditional: true,
        allErrors: true,
        strict: false,
      });

      expect(ajv).toBeDefined();
    });

    it('compiles schema and validates valid data', () => {
      const ajv = new Ajv();
      const validate = ajv.compile(simpleSchema);

      expect(validate({ name: 'test', count: 5 })).toBe(true);
    });

    it('rejects invalid data', () => {
      const ajv = new Ajv();
      const validate = ajv.compile(simpleSchema);

      expect(validate({ name: 123 })).toBe(false);
    });
  });

  describe('esbuild fallback path', () => {
    it('extracts .default when import is an object, not a function', () => {
      const fakeEsbuildImport = { default: Ajv } as unknown;

      const resolved =
        typeof fakeEsbuildImport === 'function'
          ? fakeEsbuildImport
          : (fakeEsbuildImport as Record<string, unknown>)['default'];

      expect(typeof resolved).toBe('function');
    });

    it('resolved fallback creates working validator', () => {
      const fakeEsbuildImport = { default: Ajv } as unknown;

      const Resolved =
        typeof fakeEsbuildImport === 'function'
          ? fakeEsbuildImport
          : ((fakeEsbuildImport as Record<string, unknown>)['default'] as typeof Ajv);

      const ajv = new Resolved();
      const validate = ajv.compile(simpleSchema);

      expect(validate({ name: 'test' })).toBe(true);
    });
  });
});
