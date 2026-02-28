import OptionsInvalidError from '../../errors/options-invalid-error.js';
import ParseError from '../../errors/parse-error.js';
import TracerInvalidError from '../../errors/tracer-invalid-error.js';
import type { TracerModule } from '../../types.js';
import embody from '../embody.js';

import txtCharsTracer from './txt-chars/index.js';

// Invalid TracerModule used to test error-capture behavior (empty id fails validateTracerModule)
const invalidTracer = {
  id: '',
  langs: [],
  record: () => Promise.resolve([]),
} as unknown as TracerModule;

const EXPECT_FUNCTION = 'expected function';

describe('embody', () => {
  describe('closure with properties (function-as-object)', () => {
    it('partial closure has inspectable .tracer property', () => {
      const partial = embody({ tracer: txtCharsTracer });

      expect(typeof partial).toBe('function');
      expect((partial as { tracer: unknown }).tracer).toBe(txtCharsTracer);
    });

    it('partial closure has inspectable .code property', () => {
      const partial = embody({ code: 'ab' });

      expect(typeof partial).toBe('function');
      expect((partial as { code: unknown }).code).toBe('ab');
    });

    it('partial closure has inspectable .config property', () => {
      const partial = embody({ config: { options: { remove: ['a'] } } });

      expect(typeof partial).toBe('function');
      expect((partial as { config: unknown }).config).toEqual({ options: { remove: ['a'] } });
    });

    it('partial closure has .ok = true (valid so far)', () => {
      const partial = embody({ tracer: txtCharsTracer });

      expect((partial as { ok: unknown }).ok).toBe(true);
    });

    it('partial closure has .error = undefined (not errored)', () => {
      const partial = embody({ tracer: txtCharsTracer });

      expect((partial as { error: unknown }).error).toBeUndefined();
    });

    it('.config property is deep cloned (caller cannot mutate)', () => {
      const config = { options: { remove: ['a'] } };
      const partial = embody({ config });

      config.options.remove.push('b');

      expect(
        ((partial as { config: unknown }).config as { options: { remove: string[] } }).options
          .remove,
      ).toEqual(['a']);
    });
  });

  describe('key overwriting (no duplicate-key error)', () => {
    it('later tracer value overwrites earlier', async () => {
      const partial = embody({ tracer: txtCharsTracer });
      if (typeof partial !== 'function') throw new Error(EXPECT_FUNCTION);
      const result = await (partial({ tracer: txtCharsTracer, code: 'ab', config: {} }) as Promise<{
        ok: boolean;
        tracer: typeof txtCharsTracer;
      }>);

      expect(result.ok).toBe(true);
      expect(result.tracer).toBe(txtCharsTracer);
    });

    it('later code value overwrites earlier', async () => {
      const partial = embody({ code: 'ab' });
      if (typeof partial !== 'function') throw new Error(EXPECT_FUNCTION);
      const result = await (partial({ tracer: txtCharsTracer, code: 'cd', config: {} }) as Promise<{
        ok: boolean;
        code: string;
      }>);

      expect(result.ok).toBe(true);
      expect(result.code).toBe('cd');
    });

    it('later config value overwrites earlier', async () => {
      const partial = embody({ config: {} });
      if (typeof partial !== 'function') throw new Error(EXPECT_FUNCTION);
      const result = await (partial({
        tracer: txtCharsTracer,
        code: 'ab',
        config: { options: { remove: ['a'] } },
      }) as Promise<{ ok: boolean }>);

      expect(result.ok).toBe(true);
    });
  });

  describe('full calls (all three fields present) - async', () => {
    it('returns Promise when tracer, code, and config: {} provided', () => {
      const resultPromise = embody({ tracer: txtCharsTracer, code: 'ab', config: {} });

      expect(resultPromise).toBeInstanceOf(Promise);
    });

    it('Promise resolves to { ok: true, steps }', async () => {
      const result = await embody({ tracer: txtCharsTracer, code: 'ab', config: {} });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.steps).toHaveLength(2);
      }
    });

    it('passes custom config to tracer module', async () => {
      const result = await embody({
        tracer: txtCharsTracer,
        code: 'ab',
        config: { options: { remove: ['a'], replace: {}, direction: 'lr' } },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // 'a' removed, only 'b' remains
        expect(result.steps).toHaveLength(1);
      }
    });

    it('returns error with TracerInvalidError for invalid TracerModule', async () => {
      const result = await embody({ tracer: invalidTracer, code: 'x', config: {} });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(TracerInvalidError);
      }
    });
  });

  describe('partial calls (return closures)', () => {
    it('returns function when only tracer provided', () => {
      const result = embody({ tracer: txtCharsTracer });

      expect(typeof result).toBe('function');
    });

    it('returns function when only code provided', () => {
      const result = embody({ code: 'ab' });

      expect(typeof result).toBe('function');
    });

    it('returns function when tracer and code but no config', () => {
      const result = embody({ tracer: txtCharsTracer, code: 'ab' });

      expect(typeof result).toBe('function');
    });

    it('closure completes trace when remaining pieces provided (async)', async () => {
      const step1 = embody({ tracer: txtCharsTracer });
      if (typeof step1 !== 'function') throw new Error(EXPECT_FUNCTION);
      const step2 = step1({ code: 'ab' });
      if (typeof step2 !== 'function') throw new Error(EXPECT_FUNCTION);
      const result = await step2({ config: {} });

      expect('ok' in result && result.ok).toBe(true);
      if ('steps' in result) {
        expect(result.steps).toHaveLength(2);
      }
    });

    it('closure accepts all remaining pieces at once (async)', async () => {
      const withTracer = embody({ tracer: txtCharsTracer });
      if (typeof withTracer !== 'function') throw new Error(EXPECT_FUNCTION);
      const result = await withTracer({ code: 'ab', config: {} });

      expect('ok' in result && result.ok).toBe(true);
      if ('steps' in result) {
        expect(result.steps).toHaveLength(2);
      }
    });
  });

  describe('config semantics', () => {
    it('config: {} triggers trace with tracer defaults (async)', async () => {
      const result = await embody({ tracer: txtCharsTracer, code: 'ab', config: {} });

      expect(result.ok).toBe(true);
    });

    it('config: undefined returns closure (waiting)', () => {
      const result = embody({ tracer: txtCharsTracer, code: 'ab', config: undefined });

      expect(typeof result).toBe('function');
    });

    it('missing config key returns closure (waiting)', () => {
      const result = embody({ tracer: txtCharsTracer, code: 'ab' });

      expect(typeof result).toBe('function');
    });

    it('config object triggers trace with custom config (async)', async () => {
      const result = await embody({
        tracer: txtCharsTracer,
        code: 'ab',
        config: { options: { remove: [], replace: {}, direction: 'rl' } },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // rl direction means reversed order
        expect(result.steps[0]).toHaveProperty('char', 'b');
      }
    });
  });

  describe('error handling', () => {
    it('catches ParseError and returns as ok: false (async)', async () => {
      // interrobang triggers ParseError in chars module
      const result = await embody({ tracer: txtCharsTracer, code: 'ab‽', config: {} });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(ParseError);
      }
    });

    it('preserves ParseError details (async)', async () => {
      const result = await embody({ tracer: txtCharsTracer, code: '‽', config: {} });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.message).toContain('interrobang');
        expect((result.error as ParseError).loc).toEqual({ line: 1, column: 0 });
      }
    });

    it('wraps invalid options in OptionsInvalidError (async)', async () => {
      const result = await embody({
        tracer: txtCharsTracer,
        code: 'ab',
        config: { options: { remove: 'not-array', replace: {}, direction: 'lr' } },
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeInstanceOf(OptionsInvalidError);
      }
    });
  });

  describe('result shape (includes all input keys)', () => {
    it('success result includes tracer, code, config (async)', async () => {
      const result = await embody({ tracer: txtCharsTracer, code: 'ab', config: {} });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.tracer).toBe(txtCharsTracer);
        expect(result.code).toBe('ab');
        expect(result.config).toEqual({});
      }
    });

    it('error result includes tracer, code, config (async)', async () => {
      const result = await embody({ tracer: invalidTracer, code: 'ab', config: {} });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.tracer).toBe(invalidTracer);
        expect(result.code).toBe('ab');
        expect(result.config).toEqual({});
      }
    });

    it('result includes custom config object (async)', async () => {
      const customConfig = { options: { remove: ['a'], replace: {}, direction: 'lr' as const } };
      const result = await embody({ tracer: txtCharsTracer, code: 'ab', config: customConfig });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.config).toEqual(customConfig);
      }
    });
  });

  describe('immutability', () => {
    it('caller cannot mutate internal state via config (async)', async () => {
      const config = { options: { remove: ['a'], replace: {}, direction: 'lr' as const } };
      const closure = embody({ tracer: txtCharsTracer, config });

      // Mutate the original config
      config.options.remove.push('b');

      // Closure should still work with original config
      if (typeof closure !== 'function') throw new Error(EXPECT_FUNCTION);
      const result = await closure({ code: 'ab' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should have 1 step (only 'a' removed, not 'b')
        expect(result.steps).toHaveLength(1);
      }
    });

    it('returned config is frozen (immutable) (async)', async () => {
      const result = await embody({
        tracer: txtCharsTracer,
        code: 'ab',
        config: { options: { remove: ['a'], replace: {}, direction: 'lr' as const } },
      });

      expect(result.ok).toBe(true);
      if (result.ok && result.config !== undefined) {
        expect(Object.isFrozen(result.config)).toBe(true);
      }
    });

    it('re-invoking closure does not share state (async)', async () => {
      const closure = embody({ tracer: txtCharsTracer });
      if (typeof closure !== 'function') throw new Error(EXPECT_FUNCTION);

      const result1 = await closure({ code: 'a', config: {} });
      const result2 = await closure({ code: 'ab', config: {} });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result1.steps).toHaveLength(1);
        expect(result2.steps).toHaveLength(2);
      }
    });
  });

  describe('resolvedConfig', () => {
    it('success result includes resolvedConfig with tracer defaults (async)', async () => {
      const result = await embody({ tracer: txtCharsTracer, code: 'ab', config: {} });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.resolvedConfig).toHaveProperty('options');
        expect(result.resolvedConfig.options).toHaveProperty('direction', 'lr');
        expect(result.resolvedConfig.options).toHaveProperty('remove');
        expect(result.resolvedConfig.options).toHaveProperty('replace');
      }
    });

    it('resolvedConfig includes user options merged with defaults (async)', async () => {
      const result = await embody({
        tracer: txtCharsTracer,
        code: 'ab',
        config: { options: { remove: ['a'] } },
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const options = result.resolvedConfig.options as { remove: string[]; direction: string };
        expect(options.remove).toEqual(['a']);
        expect(options.direction).toBe('lr'); // default
      }
    });

    it('resolvedConfig is frozen (immutable) (async)', async () => {
      const result = await embody({ tracer: txtCharsTracer, code: 'ab', config: {} });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(Object.isFrozen(result.resolvedConfig)).toBe(true);
        expect(Object.isFrozen(result.resolvedConfig.options)).toBe(true);
      }
    });
  });
});
