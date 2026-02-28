/**
 * @file Traces character traversal for the chars test language.
 *
 * Processes any string as a sequence of characters, producing steps
 * based on direction configuration. Used for architecture validation.
 *
 * Error triggers for testing:
 * - PARSE_ERROR: input contains interrobang (‽)
 * - RUNTIME_ERROR: input contains 3+ consecutive identical characters
 * - LIMIT_EXCEEDED: input exceeds maxLength
 *
 * Note: OPTIONS_INVALID and OPTIONS_SEMANTIC_INVALID are thrown
 * by /configuring and verify-options.ts respectively, not by record().
 */

import LimitExceededError from '../../../errors/limit-exceeded-error.js';
import ParseError from '../../../errors/parse-error.js';
import RuntimeError from '../../../errors/runtime-error.js';
import type { MetaConfig } from '../../../types.js';

import type { CharClass, CharsOptions, CharsStep } from './types.js';

/** Regex to detect 3+ consecutive identical characters */
const TRIPLE_CHAR_REGEX = /(.)\1{2}/s;

/**
 * Classifies a character into a character class.
 */
function getCharClass(char: string): CharClass {
  if (/[a-z]/.test(char)) return 'lowercase';
  if (/[A-Z]/.test(char)) return 'uppercase';
  if (/\d/.test(char)) return 'number';
  if (/[!-/:-@[-`{-~]/.test(char)) return 'punctuation';
  return 'other';
}

/**
 * Records execution trace for chars language (async for API consistency).
 * Treats input as a character sequence and produces steps for each character.
 *
 * Internally sync but returns Promise for consistency with async tracers (e.g., js-klve).
 *
 * Contract: Receives FULLY FILLED config from /configuring — never partial,
 * never undefined fields. Tracers can trust input completely and do pure tracing.
 *
 * @param code - Source string to trace
 * @param config - Configuration object with meta (execution limits) and options (tracer-specific)
 * @returns Promise resolving to trace steps, one per character (after filtering)
 * @throws ParseError, RuntimeError, or LimitExceededError
 */
// eslint-disable-next-line @typescript-eslint/require-await -- Async for API consistency with genuinely async tracers
async function record(
  code: string,
  config: { readonly meta: MetaConfig; readonly options: CharsOptions },
): Promise<readonly CharsStep[]> {
  const { meta, options } = config;

  // PARSE_ERROR: interrobang (ESTree: 0-indexed column)
  if (code.includes('‽')) {
    const index = code.indexOf('‽');
    throw new ParseError('Unexpected interrobang (‽)', { line: 1, column: index });
  }

  // RUNTIME_ERROR: triple consecutive chars (ESTree: 0-indexed column)
  const tripleMatch = TRIPLE_CHAR_REGEX.exec(code);
  if (tripleMatch) {
    throw new RuntimeError(`Triple character not allowed: "${tripleMatch[1]}" repeated 3 times`, {
      line: 1,
      column: tripleMatch.index,
    });
  }

  // LIMIT_EXCEEDED: maxLength (tracer-specific limit)
  if (options.maxLength !== undefined && code.length > options.maxLength) {
    throw new LimitExceededError(
      `Input length ${code.length} exceeds maxLength ${options.maxLength}`,
      'maxLength',
      code.length,
    );
  }

  // LIMIT_EXCEEDED: meta.max.steps (cross-tracer limit)
  // For chars, input length is a proxy for max steps
  if (meta.max.steps !== null && code.length > meta.max.steps) {
    throw new LimitExceededError(
      `Input length ${code.length} exceeds max steps ${meta.max.steps}`,
      'steps',
      code.length,
    );
  }

  const chars = [...code];
  const isReverse = options.direction === 'rl';
  const { length } = chars;

  // Process a single position, returning step data or null if filtered
  // ESTree format: loc has start/end positions, column is 0-indexed
  function processPosition(position: number): {
    readonly loc: {
      readonly start: { readonly line: 1; readonly column: number };
      readonly end: { readonly line: 1; readonly column: number };
    };
    readonly char: string;
  } | null {
    const index = isReverse ? length - 1 - position : position;
    const originalChar = chars[index];

    // Filter by remove list
    if (options.remove.includes(originalChar)) return null;

    // Filter by character class
    const charClass = getCharClass(originalChar);
    if (!options.allowedCharClasses[charClass]) return null;

    const char = options.replace[originalChar] ?? originalChar;
    // ESTree: 0-indexed column, single char so start === end
    const column = position;
    const loc = {
      start: { line: 1 as const, column },
      end: { line: 1 as const, column },
    };

    return { loc, char };
  }

  // Step data type after filtering nulls
  type StepData = {
    readonly loc: {
      readonly start: { readonly line: 1; readonly column: number };
      readonly end: { readonly line: 1; readonly column: number };
    };
    readonly char: string;
  };

  // Type guard for filtering nulls
  function isStep(item: ReturnType<typeof processPosition>): item is StepData {
    return item !== null;
  }

  // Build steps immutably: map → filter → add step numbers
  const steps = chars
    .map((_, position) => processPosition(position))
    .filter((item) => isStep(item))
    .map((item, index) => ({ step: index + 1, ...item }));

  return steps;
}

export default record;
