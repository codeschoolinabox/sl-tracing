/**
 * @file Test fixture: reverses input text, no options, txt-specific tracer (langs: ['txt']).
 * Useful for testing cache-invalidation behavior when switching between
 * language-specific and universal tracers.
 */

import type { TracerModule } from '../../types.js';

const reverseTxtTracer: TracerModule = {
  id: 'reverse-txt',
  langs: ['txt'],
  record(code) {
    return Promise.resolve(
      [...code].toReversed().map((char, index) => ({
        step: index + 1,
        loc: {
          start: { line: 1, column: code.length - 1 - index },
          end: { line: 1, column: code.length - index },
        },
        char,
      })),
    );
  },
};

export default reverseTxtTracer;
