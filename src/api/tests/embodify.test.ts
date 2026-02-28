import EmbodyError from '../../errors/embody-error.js';
import type { TracerModule } from '../../types.js';
import embodify from '../embodify.js';

import reverseTracer from './reverse.js';
import txtCharsTracer from './txt-chars/index.js';

// Invalid TracerModule used to test error-capture behavior (empty id fails validateTracerModule)
const invalidTracer = {
  id: '',
  langs: [],
  record: () => Promise.resolve([]),
} as unknown as TracerModule;

describe('embodify', () => {
  describe('state management', () => {
    it('creates chain with tracer set', () => {
      const chain = embodify({ tracer: txtCharsTracer });

      expect(chain.tracer).toBe(txtCharsTracer);
    });

    it('.set() returns NEW chain with state added', () => {
      const chain1 = embodify({ tracer: txtCharsTracer });
      const chain2 = chain1.set({ code: 'ab' });

      expect(chain2.code).toBe('ab');
      expect(chain2.tracer).toBe(txtCharsTracer);
    });

    it('original chain unchanged after .set() (immutability)', () => {
      const chain1 = embodify({ tracer: txtCharsTracer });
      chain1.set({ code: 'ab' });

      expect(chain1.code).toBeUndefined();
    });

    it('getters return current state values', () => {
      const chain = embodify({
        tracer: txtCharsTracer,
        code: 'ab',
        config: { options: { remove: ['a'] } },
      });

      expect(chain.tracer).toBe(txtCharsTracer);
      expect(chain.code).toBe('ab');
      expect(chain.config).toEqual({ options: { remove: ['a'] } });
    });
  });

  describe('before trace', () => {
    it('.steps is undefined before .trace() called', () => {
      const chain = embodify({ tracer: txtCharsTracer, code: 'ab' });

      expect(chain.steps).toBeUndefined();
    });

    it('.ok is true before trace', () => {
      const chain = embodify({ tracer: txtCharsTracer, code: 'ab' });

      expect(chain.ok).toBe(true);
    });

    it('.error is undefined before trace', () => {
      const chain = embodify({ tracer: txtCharsTracer, code: 'ab' });

      expect(chain.error).toBeUndefined();
    });
  });

  describe('tracing (async)', () => {
    it('.trace() returns a Promise', () => {
      const result = embodify({ tracer: txtCharsTracer, code: 'ab' }).trace();

      expect(result).toBeInstanceOf(Promise);
    });

    it('.trace() uses default config if none set', async () => {
      const traced = await embodify({ tracer: txtCharsTracer, code: 'ab' }).trace();

      expect(traced.ok).toBe(true);
      expect(traced.steps).toHaveLength(2);
    });

    it('.trace({ config }) uses provided config', async () => {
      const traced = await embodify({ tracer: txtCharsTracer, code: 'ab' }).trace({
        config: { options: { remove: ['a'], replace: {}, direction: 'lr' } },
      });

      expect(traced.ok).toBe(true);
      expect(traced.steps).toHaveLength(1);
    });

    it('.trace() returns NEW chain with result', async () => {
      const chain = embodify({ tracer: txtCharsTracer, code: 'ab' });
      const traced = await chain.trace();

      expect(traced.ok).toBe(true);
      expect(traced.steps).toBeDefined();
      expect(chain.steps).toBeUndefined(); // Original unchanged
    });

    it('after successful trace .ok is true', async () => {
      const traced = await embodify({ tracer: txtCharsTracer, code: 'ab' }).trace();

      expect(traced.ok).toBe(true);
    });

    it('after successful trace .steps contains step array', async () => {
      const traced = await embodify({ tracer: txtCharsTracer, code: 'ab' }).trace();

      expect(Array.isArray(traced.steps)).toBe(true);
      expect(traced.steps).toHaveLength(2);
    });

    it('after failed trace .error contains EmbodyError', async () => {
      const traced = await embodify({ tracer: invalidTracer, code: 'ab' }).trace();

      expect(traced.ok).toBe(false);
      expect(traced.error).toBeInstanceOf(EmbodyError);
    });
  });

  describe('cache invalidation', () => {
    describe('tracer change via .set()', () => {
      it('clears config when tracer changes', () => {
        const chain1 = embodify({
          tracer: txtCharsTracer,
          config: { meta: { max: { steps: 100 } } },
        });
        expect(chain1.config).toBeDefined();

        const chain2 = chain1.set({ tracer: reverseTracer });
        expect(chain2.config).toBeUndefined();
      });

      it('clears resolvedConfig when tracer changes', () => {
        const chain1 = embodify({ tracer: txtCharsTracer, config: {} });
        const resolved1 = chain1.resolvedConfig;
        expect(resolved1).toBeDefined();

        const chain2 = chain1.set({ tracer: reverseTracer, config: {} });
        const resolved2 = chain2.resolvedConfig;
        expect(resolved2).not.toBe(resolved1); // Different object (different tracer options)
      });

      it('clears steps when tracer changes', async () => {
        const chain1 = await embodify({
          tracer: txtCharsTracer,
          code: 'hello',
          config: {},
        }).trace();
        expect(chain1.steps).toBeDefined();

        const chain2 = chain1.set({ tracer: reverseTracer });
        expect(chain2.steps).toBeUndefined(); // Cleared (not traced yet)
      });

      it('keeps code when tracer changes (universal reverse tracer)', () => {
        const chain1 = embodify({ tracer: txtCharsTracer, code: 'hello' });
        expect(chain1.code).toBe('hello');

        // reverseTracer.langs = [] (universal) → code always preserved
        const chain2 = chain1.set({ tracer: reverseTracer });
        expect(chain2.code).toBe('hello'); // PRESERVED
      });
    });

    describe('code change via .set()', () => {
      it('keeps config when code changes', () => {
        const cfg = { meta: { max: { steps: 100 } } };
        const chain1 = embodify({ tracer: txtCharsTracer, code: 'hello', config: cfg });

        const chain2 = chain1.set({ code: 'world' });
        expect(chain2.config).toEqual(cfg); // PRESERVED
      });

      it('keeps resolvedConfig when code changes', () => {
        const chain1 = embodify({ tracer: txtCharsTracer, code: 'hello', config: {} });
        const resolved1 = chain1.resolvedConfig;

        const chain2 = chain1.set({ code: 'world' });
        const resolved2 = chain2.resolvedConfig;
        expect(resolved2).toEqual(resolved1); // Same config values (deep equality)
      });

      it('clears steps when code changes', async () => {
        const chain1 = await embodify({
          tracer: txtCharsTracer,
          code: 'hello',
          config: {},
        }).trace();
        expect(chain1.steps).toBeDefined();

        const chain2 = chain1.set({ code: 'world' });
        expect(chain2.steps).toBeUndefined(); // Cleared
      });

      it('keeps tracer when code changes', () => {
        const chain1 = embodify({ tracer: txtCharsTracer, code: 'hello' });
        const chain2 = chain1.set({ code: 'world' });
        expect(chain2.tracer).toBe(txtCharsTracer); // PRESERVED
      });
    });

    describe('config change via .set()', () => {
      it('keeps code when config changes', () => {
        const chain1 = embodify({ tracer: txtCharsTracer, code: 'hello', config: {} });
        const chain2 = chain1.set({ config: { meta: { max: { steps: 100 } } } });
        expect(chain2.code).toBe('hello'); // PRESERVED
      });

      it('keeps tracer when config changes', () => {
        const chain1 = embodify({ tracer: txtCharsTracer, code: 'hello', config: {} });
        const chain2 = chain1.set({ config: { meta: { max: { steps: 50 } } } });
        expect(chain2.tracer).toBe(txtCharsTracer); // PRESERVED
      });

      it('clears resolvedConfig when config changes', () => {
        const chain1 = embodify({ tracer: txtCharsTracer, config: {} });
        const resolved1 = chain1.resolvedConfig;

        const chain2 = chain1.set({ config: { meta: { max: { steps: 50 } } } });
        const resolved2 = chain2.resolvedConfig;
        expect(resolved2).not.toBe(resolved1); // Different object
      });

      it('clears steps when config changes', async () => {
        const chain1 = await embodify({
          tracer: txtCharsTracer,
          code: 'hello',
          config: {},
        }).trace();
        expect(chain1.steps).toBeDefined();

        const chain2 = chain1.set({ config: { meta: { max: { steps: 50 } } } });
        expect(chain2.steps).toBeUndefined(); // Cleared
      });
    });

    describe('realistic scenarios', () => {
      it('can compare two tracers on same code', async () => {
        const code = 'hello';
        const chain1 = await embodify({ tracer: reverseTracer, code, config: {} }).trace();

        // Switch to different tracer, same code (reverseTracer.langs=[] → code preserved)
        const chain2 = await chain1.set({ tracer: txtCharsTracer, config: {} }).trace();
        expect(chain2.code).toBe(code); // Code preserved
        expect(chain2.config).toEqual({}); // Had to re-provide config
        expect(chain2.steps).not.toEqual(chain1.steps); // Different tracers = different step order
      });

      it('can explicitly preserve meta when switching tracers', () => {
        const chain1 = embodify({
          tracer: txtCharsTracer,
          config: { meta: { max: { steps: 100 } } },
        });
        const oldMeta = chain1.resolvedConfig!.meta;

        const chain2 = chain1.set({
          tracer: reverseTracer,
          config: { meta: oldMeta, options: {} },
        });

        expect(chain2.resolvedConfig?.meta).toEqual(oldMeta);
      });
    });
  });

  describe('lazy resolvedConfig', () => {
    it('computes on access if tracer is present', () => {
      const chain = embodify({ tracer: txtCharsTracer });

      expect(chain.resolvedConfig).toBeDefined();
      expect(chain.resolvedConfig?.options).toHaveProperty('direction', 'lr');
    });

    it('returns undefined if tracer is missing', () => {
      const chain = embodify({});

      expect(chain.resolvedConfig).toBeUndefined();
    });

    it('caches computed value', () => {
      const chain = embodify({ tracer: txtCharsTracer });

      const resolved1 = chain.resolvedConfig;
      const resolved2 = chain.resolvedConfig;

      expect(resolved1).toEqual(resolved2);
    });

    it('returns same frozen reference each call', () => {
      const chain = embodify({ tracer: txtCharsTracer });

      const resolved1 = chain.resolvedConfig;
      const resolved2 = chain.resolvedConfig;

      // Freeze once, return as-is — same reference
      expect(resolved1).toBe(resolved2);
      expect(Object.isFrozen(resolved1)).toBe(true);
    });

    it('after trace returns resolved config with tracer defaults', async () => {
      const traced = await embodify({ tracer: txtCharsTracer, code: 'ab' }).trace();

      expect(traced.resolvedConfig).toHaveProperty('options');
      expect(traced.resolvedConfig?.options).toHaveProperty('direction', 'lr');
    });
  });

  describe('necessity validation (lazy, async)', () => {
    it('.trace() on chain missing tracer returns error', async () => {
      const traced = await embodify({ code: 'ab' }).trace();

      expect(traced.ok).toBe(false);
      expect(traced.error?.message).toMatch(/tracer is required/);
    });

    it('.trace() on chain missing code returns error', async () => {
      const traced = await embodify({ tracer: txtCharsTracer }).trace();

      expect(traced.ok).toBe(false);
      expect(traced.error?.message).toMatch(/code is required/);
    });
  });

  describe('immutability', () => {
    it('.config getter returns frozen object (same reference each call)', () => {
      const chain = embodify({ config: { options: { remove: ['a'] } } });

      const config1 = chain.config;
      const config2 = chain.config;

      // Freeze once, return as-is — same frozen reference
      expect(config1).toBe(config2);
      expect(Object.isFrozen(config1)).toBe(true);
    });

    it('.steps getter returns frozen steps (same reference each call)', async () => {
      const traced = await embodify({ tracer: txtCharsTracer, code: 'ab' }).trace();

      const steps1 = traced.steps;
      const steps2 = traced.steps;

      // Freeze once, return as-is — same frozen reference
      expect(steps1).toBe(steps2);
      expect(Object.isFrozen(steps1)).toBe(true);
    });
  });
});
