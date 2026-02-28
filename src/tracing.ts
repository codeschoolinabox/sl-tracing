/**
 * @file Default export and primary entry point for @study-lenses/tracing.
 *
 * `tracing(tracerModule)` validates the TracerModule once upfront and returns
 * all four API wrappers pre-bound to it.
 *
 * @example
 * ```typescript
 * import tracing from '@study-lenses/tracing';
 * import myTracer from '@study-lenses/trace-js-klve';
 *
 * const { trace, tracify, embody, embodify } = tracing(myTracer);
 *
 * // All wrappers use myTracer — no need to pass it on every call
 * const steps = await trace('let x = 1;');
 * const result = await embody({ code: 'let x = 1;', config: {} });
 * ```
 */

import embodify from './api/embodify.js';
import embody from './api/embody.js';
import trace from './api/trace.js';
import tracify from './api/tracify.js';
import validateTracerModule from './api/validate-tracer-module.js';
import type { TracerModule } from './types.js';

/**
 * Validates a TracerModule and returns all four API wrappers pre-bound to it.
 *
 * @remarks
 * Validation happens once at call time — before any wrapper is invoked.
 * If the TracerModule is invalid, `tracing()` throws immediately with a
 * `TracerInvalidError` listing all violations. Wrappers are never returned
 * in an invalid state.
 *
 * The returned `trace` is the curried form: `(code, config?) => Promise<StepCore[]>`.
 * The returned `tracify` is a chain with the tracer pre-set.
 * The returned `embody` is a closure with the tracer pre-set.
 * The returned `embodify` is a chain with the tracer pre-set.
 *
 * @param tracerModule - A valid `TracerModule` object
 * @returns Frozen object with all four pre-bound API wrappers:
 *   - `trace(code, config?)` — positional args, throws on error
 *   - `tracify` — chainable builder with tracer pre-set, throws on error
 *   - `embody({ code, config? })` — keyed args with partial application, returns Result
 *   - `embodify({ code?, config? })` — immutable chainable builder, returns Result
 * @throws {TracerInvalidError} if `tracerModule` does not satisfy the contract
 *
 * @example
 * ```typescript
 * const api = tracing(myTracer);
 * const steps = await api.trace('hello');
 * const result = await api.embody({ code: 'hello', config: {} });
 * ```
 */
function tracing(tracerModule: TracerModule) {
  validateTracerModule(tracerModule);

  return Object.freeze({
    trace: trace(tracerModule),
    tracify: tracify.tracer(tracerModule),
    embody: embody({ tracer: tracerModule }),
    embodify: embodify({ tracer: tracerModule }),
  });
}

export default tracing;
