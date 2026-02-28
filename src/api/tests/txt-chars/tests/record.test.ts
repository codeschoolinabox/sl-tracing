/**
 * Tests for chars record function.
 *
 * Note: record() now receives FULLY-FILLED config from /configuring.
 * Option validation (OPTIONS_SCHEMA_INVALID) is tested in /configuring tests.
 * Semantic validation (OPTIONS_SEMANTIC_INVALID) is tested in verify-options.test.ts.
 */

import LimitExceededError from '../../../../errors/limit-exceeded-error.js';
import ParseError from '../../../../errors/parse-error.js';
import RuntimeError from '../../../../errors/runtime-error.js';
import type { MetaConfig } from '../../types.js';
import txtCharsTracer from '../index.js';
import type { CharsOptions } from '../types.js';

const { record } = txtCharsTracer;

/** Default meta config for tests (all limits disabled) */
const DEFAULT_META: MetaConfig = {
  max: { steps: null, iterations: null, callstack: null, time: null },
  range: null,
  timestamps: false,
  debug: { ast: false },
};

/** Default fully-filled options matching schema defaults */
const DEFAULT_OPTIONS: CharsOptions = {
  remove: [],
  replace: {},
  direction: 'lr',
  allowedCharClasses: {
    lowercase: true,
    uppercase: true,
    number: true,
    punctuation: true,
    other: true,
  },
};

/** Config with default meta and options */
const defaultConfig = { meta: DEFAULT_META, options: DEFAULT_OPTIONS };

/** Creates config with custom options merged over defaults */
function config(overrides: Partial<CharsOptions>): { meta: MetaConfig; options: CharsOptions } {
  return { meta: DEFAULT_META, options: { ...DEFAULT_OPTIONS, ...overrides } };
}

/** Typed wrapper for expect.objectContaining to satisfy TypeScript */
function errorWith(properties: Record<string, unknown>): Error {
  return expect.objectContaining(properties) as unknown as Error;
}

describe('record (async)', () => {
  describe('basic traversal', () => {
    it('produces complete trace with all step properties', async () => {
      const steps = await record('ab', defaultConfig);
      expect(steps).toEqual([
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }, char: 'a' },
        { step: 2, loc: { start: { line: 1, column: 1 }, end: { line: 1, column: 1 } }, char: 'b' },
      ]);
    });

    it('produces one step per character', async () => {
      const steps = await record('abc', defaultConfig);
      expect(steps).toHaveLength(3);
    });

    it('returns empty array for empty string', async () => {
      const steps = await record('', defaultConfig);
      expect(steps).toHaveLength(0);
    });

    it('assigns sequential step numbers starting at 1', async () => {
      const steps = await record('abc', defaultConfig);
      expect(steps.map((s) => s.step)).toEqual([1, 2, 3]);
    });

    it('assigns 0-indexed column positions (ESTree)', async () => {
      const steps = await record('abc', defaultConfig);
      expect(steps.map((s) => s.loc.start.column)).toEqual([0, 1, 2]);
    });

    it('sets line to 1 for all characters', async () => {
      const steps = await record('abc', defaultConfig);
      expect(steps.every((s) => s.loc.start.line === 1)).toBe(true);
    });

    it('captures the character at each position', async () => {
      const steps = await record('abc', defaultConfig);
      expect(steps.map((s) => s.char)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('direction', () => {
    it('traverses left-to-right with lr direction', async () => {
      const steps = await record('abc', config({ direction: 'lr' }));
      expect(steps.map((s) => s.char)).toEqual(['a', 'b', 'c']);
    });

    it('traverses right-to-left with rl direction', async () => {
      const steps = await record('abc', config({ direction: 'rl' }));
      expect(steps.map((s) => s.char)).toEqual(['c', 'b', 'a']);
    });

    it('assigns sequential column positions with rl direction', async () => {
      const steps = await record('abc', config({ direction: 'rl' }));
      expect(steps.map((s) => s.loc.start.column)).toEqual([0, 1, 2]);
    });

    it('assigns step numbers in traversal order with rl', async () => {
      const steps = await record('abc', config({ direction: 'rl' }));
      expect(steps[0].step).toBe(1);
      expect(steps[0].char).toBe('c');
    });
  });

  describe('remove filter', () => {
    it('excludes characters in remove array', async () => {
      const steps = await record('abc', config({ remove: ['b'] }));
      expect(steps.map((s) => s.char)).toEqual(['a', 'c']);
    });

    it('excludes multiple characters', async () => {
      const steps = await record('abcd', config({ remove: ['a', 'c'] }));
      expect(steps.map((s) => s.char)).toEqual(['b', 'd']);
    });

    it('renumbers steps after removal', async () => {
      const steps = await record('abc', config({ remove: ['b'] }));
      expect(steps.map((s) => s.step)).toEqual([1, 2]);
    });

    it('preserves original column positions after removal', async () => {
      const steps = await record('abc', config({ remove: ['b'] }));
      expect(steps.map((s) => s.loc.start.column)).toEqual([0, 2]);
    });
  });

  describe('replace filter', () => {
    it('substitutes characters according to replace map', async () => {
      const steps = await record('abc', config({ replace: { a: 'x' } }));
      expect(steps.map((s) => s.char)).toEqual(['x', 'b', 'c']);
    });

    it('applies multiple replacements', async () => {
      const steps = await record('abc', config({ replace: { a: 'x', c: 'z' } }));
      expect(steps.map((s) => s.char)).toEqual(['x', 'b', 'z']);
    });

    it('preserves column positions after replacement', async () => {
      const steps = await record('abc', config({ replace: { a: 'x' } }));
      expect(steps.map((s) => s.loc.start.column)).toEqual([0, 1, 2]);
    });
  });

  describe('combined filters', () => {
    it('applies remove before replace (removes original char)', async () => {
      const steps = await record('abc', config({ remove: ['a'], replace: { a: 'x' } }));
      expect(steps.map((s) => s.char)).toEqual(['b', 'c']);
    });

    it('combines direction with remove', async () => {
      const steps = await record('abc', config({ direction: 'rl', remove: ['b'] }));
      expect(steps.map((s) => s.char)).toEqual(['c', 'a']);
    });

    it('combines direction with replace', async () => {
      const steps = await record('abc', config({ direction: 'rl', replace: { a: 'x' } }));
      expect(steps.map((s) => s.char)).toEqual(['c', 'b', 'x']);
    });
  });

  describe('character class filter', () => {
    it('excludes lowercase when lowercase is false', async () => {
      const steps = await record(
        'aBc',
        config({
          allowedCharClasses: { ...DEFAULT_OPTIONS.allowedCharClasses, lowercase: false },
        }),
      );
      expect(steps.map((s) => s.char)).toEqual(['B']);
    });

    it('excludes uppercase when uppercase is false', async () => {
      const steps = await record(
        'aBc',
        config({
          allowedCharClasses: { ...DEFAULT_OPTIONS.allowedCharClasses, uppercase: false },
        }),
      );
      expect(steps.map((s) => s.char)).toEqual(['a', 'c']);
    });

    it('excludes numbers when number is false', async () => {
      const steps = await record(
        'a1b2c',
        config({
          allowedCharClasses: { ...DEFAULT_OPTIONS.allowedCharClasses, number: false },
        }),
      );
      expect(steps.map((s) => s.char)).toEqual(['a', 'b', 'c']);
    });

    it('excludes punctuation when punctuation is false', async () => {
      const steps = await record(
        'a!b@c',
        config({
          allowedCharClasses: { ...DEFAULT_OPTIONS.allowedCharClasses, punctuation: false },
        }),
      );
      expect(steps.map((s) => s.char)).toEqual(['a', 'b', 'c']);
    });

    it('excludes other (spaces, newlines) when other is false', async () => {
      const steps = await record(
        'a b\nc',
        config({
          allowedCharClasses: { ...DEFAULT_OPTIONS.allowedCharClasses, other: false },
        }),
      );
      expect(steps.map((s) => s.char)).toEqual(['a', 'b', 'c']);
    });

    it('excludes multiple classes', async () => {
      const steps = await record(
        'aBc!',
        config({
          allowedCharClasses: {
            lowercase: true,
            uppercase: false,
            number: false,
            punctuation: true,
            other: true,
          },
        }),
      );
      expect(steps.map((s) => s.char)).toEqual(['a', 'c', '!']);
    });

    it('preserves column positions after filtering', async () => {
      const steps = await record(
        'aBCd',
        config({
          allowedCharClasses: { ...DEFAULT_OPTIONS.allowedCharClasses, uppercase: false },
        }),
      );
      expect(steps.map((s) => s.loc.start.column)).toEqual([0, 3]);
    });

    it('combines with remove filter', async () => {
      const steps = await record(
        'aAbB',
        config({
          remove: ['a'],
          allowedCharClasses: { ...DEFAULT_OPTIONS.allowedCharClasses, uppercase: false },
        }),
      );
      expect(steps.map((s) => s.char)).toEqual(['b']);
    });
  });

  describe('special characters', () => {
    it('handles newlines as characters', async () => {
      const steps = await record('a\nb', defaultConfig);
      expect(steps).toHaveLength(3);
      expect(steps[1].char).toBe('\n');
    });

    it('handles spaces', async () => {
      const steps = await record('a b', defaultConfig);
      expect(steps[1].char).toBe(' ');
    });

    it('handles unicode characters', async () => {
      const steps = await record('añb', defaultConfig);
      expect(steps).toHaveLength(3);
      expect(steps[1].char).toBe('ñ');
    });
  });

  describe('error handling', () => {
    describe('ParseError (interrobang)', () => {
      it('rejects with ParseError for interrobang character', async () => {
        await expect(record('ab‽cd', defaultConfig)).rejects.toThrow('Unexpected interrobang');
      });

      it('throws ParseError type', async () => {
        await expect(record('ab‽cd', defaultConfig)).rejects.toBeInstanceOf(ParseError);
      });

      it('includes location at column 2 for ab‽cd (0-indexed)', async () => {
        await expect(record('ab‽cd', defaultConfig)).rejects.toThrow(
          errorWith({ loc: { line: 1, column: 2 } }),
        );
      });

      it('includes location at column 0 when interrobang is first', async () => {
        await expect(record('‽abc', defaultConfig)).rejects.toThrow(
          errorWith({ loc: { line: 1, column: 0 } }),
        );
      });
    });

    describe('RuntimeError (triple consecutive chars)', () => {
      it('rejects with RuntimeError for triple consecutive characters', async () => {
        await expect(record('abaaa', defaultConfig)).rejects.toThrow(
          /triple character not allowed/i,
        );
      });

      it('throws RuntimeError type', async () => {
        await expect(record('abaaa', defaultConfig)).rejects.toBeInstanceOf(RuntimeError);
      });

      it('includes location at column 2 for abaaa (0-indexed)', async () => {
        await expect(record('abaaa', defaultConfig)).rejects.toThrow(
          errorWith({ loc: { line: 1, column: 2 } }),
        );
      });

      it('includes location at column 0 when triple starts at beginning', async () => {
        await expect(record('aaab', defaultConfig)).rejects.toThrow(
          errorWith({ loc: { line: 1, column: 0 } }),
        );
      });

      it('rejects for triple spaces', async () => {
        await expect(record('a   b', defaultConfig)).rejects.toThrow(
          /triple character not allowed/i,
        );
      });

      it('rejects for triple digits', async () => {
        await expect(record('a111b', defaultConfig)).rejects.toThrow(
          /triple character not allowed/i,
        );
      });
    });

    describe('LimitExceededError (maxLength)', () => {
      it('rejects with LimitExceededError when code exceeds maxLength', async () => {
        await expect(record('abcd', config({ maxLength: 3 }))).rejects.toThrow('exceeds maxLength');
      });

      it('allows code at exactly maxLength', async () => {
        const steps = await record('abc', config({ maxLength: 3 }));
        expect(steps).toHaveLength(3);
      });

      it('throws LimitExceededError type', async () => {
        await expect(record('abcd', config({ maxLength: 2 }))).rejects.toBeInstanceOf(
          LimitExceededError,
        );
      });

      it('includes actual length in error message', async () => {
        await expect(record('abcd', config({ maxLength: 2 }))).rejects.toThrow(/4/);
      });

      it('includes maxLength limit in error message', async () => {
        await expect(record('abcd', config({ maxLength: 2 }))).rejects.toThrow(/2/);
      });

      it('does not check maxLength when undefined', async () => {
        const steps = await record('ab'.repeat(500), defaultConfig);
        expect(steps).toHaveLength(1000);
      });
    });

    describe('LimitExceededError (meta.max.steps)', () => {
      it('rejects when code exceeds meta.max.steps', async () => {
        const metaWithLimit = { ...DEFAULT_META, max: { ...DEFAULT_META.max, steps: 3 } };
        await expect(
          record('abcd', { meta: metaWithLimit, options: DEFAULT_OPTIONS }),
        ).rejects.toThrow('exceeds max steps');
      });

      it('allows code at exactly meta.max.steps', async () => {
        const metaWithLimit = { ...DEFAULT_META, max: { ...DEFAULT_META.max, steps: 3 } };
        const steps = await record('abc', { meta: metaWithLimit, options: DEFAULT_OPTIONS });
        expect(steps).toHaveLength(3);
      });

      it('does not check meta.max.steps when null', async () => {
        const steps = await record('ab'.repeat(500), defaultConfig);
        expect(steps).toHaveLength(1000);
      });
    });
  });
});
