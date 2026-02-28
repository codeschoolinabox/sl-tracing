/**
 * @file Test fixture: reverses input text, no options, universal tracer (langs: []).
 */

import type { TracerModule } from '../../types.js';

const reverseTracer: TracerModule = {
  id: 'reverse',
  langs: [],
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

export default reverseTracer;
