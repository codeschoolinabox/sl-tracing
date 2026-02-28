import OptionsSemanticInvalidError from '../../errors/options-semantic-invalid-error.js';
import TracerInvalidError from '../../errors/tracer-invalid-error.js';
import type { TracerModule } from '../../types.js';
import trace from '../trace.js';

import txtCharsTracer from './txt-chars/index.js';

describe('trace', () => {
  describe('async behavior', () => {
    it('returns a Promise', () => {
      const result = trace(txtCharsTracer, 'ab');

      expect(result).toBeInstanceOf(Promise);
    });

    it('resolves to steps array', async () => {
      const steps = await trace(txtCharsTracer, 'ab');

      expect(Array.isArray(steps)).toBe(true);
      expect(steps).toHaveLength(2);
    });
  });

  describe('type validation (eager, sync)', () => {
    it('throws TracerInvalidError for non-object tracer', () => {
      expect(() => trace(123 as unknown as TracerModule, 'ab')).toThrow(TracerInvalidError);
    });

    it('throws immediately for non-string code', () => {
      expect(() => trace(txtCharsTracer, 456 as unknown as string)).toThrow(/string/);
    });
  });

  describe('tracer validation (eager, sync)', () => {
    it('throws TracerInvalidError for invalid TracerModule shape', () => {
      expect(() => trace({} as unknown as TracerModule, 'ab')).toThrow(TracerInvalidError);
    });

    it('includes violation details in error message', () => {
      expect(() => trace({} as unknown as TracerModule, 'ab')).toThrow(
        /id must be a non-empty string/,
      );
    });
  });

  describe('config handling', () => {
    it('passes config to tracer module', async () => {
      const steps = await trace(txtCharsTracer, 'ab', {
        options: { remove: ['a'], replace: {}, direction: 'lr' },
      });

      expect(steps).toHaveLength(1);
    });

    it('uses tracer defaults when no config', async () => {
      const steps = await trace(txtCharsTracer, 'ab');

      expect(steps).toHaveLength(2);
    });

    it('fills defaults for partial options', async () => {
      // User provides only direction, API fills remove and replace from schema
      const steps = await trace(txtCharsTracer, 'abc', {
        options: { direction: 'rl' },
      });

      // rl direction reverses: c, b, a
      expect(steps.map((s) => (s as { char: string }).char)).toEqual(['c', 'b', 'a']);
    });
  });

  describe('semantic validation (verifyOptions, sync)', () => {
    it('throws sync OptionsSemanticInvalidError for constraint violation', () => {
      // chars verifyOptions: maxLength must be >= remove.length
      expect(() =>
        trace(txtCharsTracer, 'abc', {
          options: { maxLength: 1, remove: ['a', 'b'] },
        }),
      ).toThrow(OptionsSemanticInvalidError);
    });

    it('includes descriptive message about the constraint violation', () => {
      expect(() =>
        trace(txtCharsTracer, 'abc', {
          options: { maxLength: 1, remove: ['a', 'b', 'c'] },
        }),
      ).toThrow(/maxLength/);
    });
  });
});
