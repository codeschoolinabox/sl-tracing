import ParseError from '../../errors/parse-error.js';
import TracerInvalidError from '../../errors/tracer-invalid-error.js';
import type { TracerModule } from '../../types.js';
import tracify from '../tracify.js';

import txtCharsTracer from './txt-chars/index.js';

describe('tracify', () => {
  describe('async behavior', () => {
    it('.steps returns a Promise', () => {
      const result = tracify.tracer(txtCharsTracer).code('ab').steps;

      expect(result).toBeInstanceOf(Promise);
    });

    it('.steps resolves to steps array', async () => {
      const steps = await tracify.tracer(txtCharsTracer).code('ab').steps;

      expect(Array.isArray(steps)).toBe(true);
      expect(steps).toHaveLength(2);
    });

    it('.resolvedConfig returns sync (not Promise)', () => {
      const result = tracify.tracer(txtCharsTracer).resolvedConfig;

      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toHaveProperty('meta');
      expect(result).toHaveProperty('options');
    });
  });

  describe('basic chaining', () => {
    it('.tracer().code().steps resolves to steps array', async () => {
      const steps = await tracify.tracer(txtCharsTracer).code('ab').steps;

      expect(Array.isArray(steps)).toBe(true);
      expect(steps).toHaveLength(2);
    });

    it('.code().tracer().steps works (order independent)', async () => {
      const steps = await tracify.code('ab').tracer(txtCharsTracer).steps;

      expect(steps).toHaveLength(2);
    });

    it('.steps is a lazy getter (traces on access)', async () => {
      const chain = tracify.tracer(txtCharsTracer).code('ab');
      // Access .steps twice — should work both times
      const steps1 = await chain.steps;
      const steps2 = await chain.steps;

      expect(steps1).toHaveLength(2);
      expect(steps2).toHaveLength(2);
    });
  });

  describe('config handling', () => {
    it('.config() passes config to tracer module', async () => {
      const steps = await tracify
        .tracer(txtCharsTracer)
        .code('ab')
        .config({ options: { remove: ['a'], replace: {}, direction: 'lr' } }).steps;

      expect(steps).toHaveLength(1);
    });

    it('without .config() uses tracer defaults', async () => {
      const steps = await tracify.tracer(txtCharsTracer).code('ab').steps;

      expect(steps).toHaveLength(2);
    });
  });

  describe('type validation (eager, sync)', () => {
    it('.tracer() throws TracerInvalidError for non-object', () => {
      expect(() => tracify.tracer(123 as unknown as TracerModule)).toThrow(TracerInvalidError);
    });

    it('.tracer() message says "plain object" for non-object input', () => {
      expect(() => tracify.tracer(null as unknown as TracerModule)).toThrow(/plain object/);
    });

    it('.code() throws immediately on non-string', () => {
      expect(() => tracify.code(456 as unknown as string)).toThrow(/expected a string/);
    });

    it('.code() throws with descriptive message including actual type', () => {
      expect(() => tracify.code(undefined as unknown as string)).toThrow(/got undefined/);
    });
  });

  describe('validation (sync throws from getters)', () => {
    it('.tracer() throws TracerInvalidError for invalid TracerModule', () => {
      expect(() => tracify.tracer({} as unknown as TracerModule)).toThrow(TracerInvalidError);
    });

    it('.steps throws when tracer missing', () => {
      expect(() => tracify.code('ab').steps).toThrow(/tracer.*required/i);
    });

    it('.steps throws when code missing', () => {
      expect(() => tracify.tracer(txtCharsTracer).steps).toThrow(/code.*required/i);
    });

    it('.steps rejects with ParseError from tracer module (async)', async () => {
      await expect(tracify.tracer(txtCharsTracer).code('‽').steps).rejects.toBeInstanceOf(
        ParseError,
      );
    });
  });

  describe('immutability', () => {
    it('config is deep cloned on entry — caller mutation does not affect chain', async () => {
      const config = { options: { remove: ['a'], replace: {}, direction: 'lr' as const } };
      const chain = tracify.tracer(txtCharsTracer).code('ab').config(config);

      // Mutate original after storing in chain
      config.options.remove.push('b');

      // Chain should still have original config (only 'a' removed)
      const steps = await chain.steps;
      expect(steps).toHaveLength(1);
    });
  });

  describe('memoization', () => {
    it('does not re-trace on multiple .steps accesses', async () => {
      const chain = tracify.tracer(txtCharsTracer).code('ab');

      const steps1 = await chain.steps;
      const steps2 = await chain.steps;

      // Same content, same frozen reference (freeze once, return as-is)
      expect(steps1).toEqual(steps2);
      expect(steps1).toBe(steps2);
    });

    it('.steps are frozen (immutable)', async () => {
      const chain = tracify.tracer(txtCharsTracer).code('ab');
      const steps = await chain.steps;

      expect(Object.isFrozen(steps)).toBe(true);
      expect(Object.isFrozen(steps[0])).toBe(true);
    });
  });

  describe('resolvedConfig getter (sync)', () => {
    it('.resolvedConfig returns options with tracer defaults', () => {
      const chain = tracify.tracer(txtCharsTracer);
      const resolved = chain.resolvedConfig;

      expect(resolved).toHaveProperty('options');
      expect(resolved.options).toHaveProperty('direction', 'lr');
      expect(resolved.options).toHaveProperty('remove');
      expect(resolved.options).toHaveProperty('replace');
    });

    it('.resolvedConfig includes user-provided options merged with defaults', () => {
      const chain = tracify.tracer(txtCharsTracer).config({ options: { remove: ['a'] } });
      const resolved = chain.resolvedConfig;

      expect((resolved.options as { remove: string[] }).remove).toEqual(['a']);
      expect((resolved.options as { direction: string }).direction).toBe('lr'); // default
    });

    it('.resolvedConfig returns same frozen reference each call', () => {
      const chain = tracify.tracer(txtCharsTracer);

      const resolved1 = chain.resolvedConfig;
      const resolved2 = chain.resolvedConfig;

      // Freeze once, return as-is — same reference
      expect(resolved1).toBe(resolved2);
      expect(Object.isFrozen(resolved1)).toBe(true);
    });

    it('.resolvedConfig does not require code', () => {
      const resolved = tracify.tracer(txtCharsTracer).resolvedConfig;

      expect(resolved).toHaveProperty('meta');
      expect(resolved).toHaveProperty('options');
    });
  });
});
