/**
 * @file Simple tracing function.
 *
 * Positional args, throws on error. Curryable: `trace(tracerModule)` returns
 * a pre-bound function `(code, config?) => Promise<StepCore[]>`.
 *
 * All validation and config prep is SYNCHRONOUS — errors throw immediately.
 * Only the final `record()` call is async.
 */

import metaSchema from '../configuring/meta-schema.js';
import prepareConfig from '../configuring/prepare-config.js';
import type { JSONSchema } from '../configuring/types.js';
import ArgumentInvalidError from '../errors/argument-invalid-error.js';
import type { MetaConfig, StepCore, TracerModule } from '../types.js';
import deepFreezeInPlace from '../utils/deep-freeze-in-place.js';
import deepFreeze from '../utils/deep-freeze.js';

import validateTracerModule from './validate-tracer-module.js';

/**
 * Traces code execution using the given tracer module.
 *
 * @remarks
 * Curryable: `trace(tracerModule)` returns a pre-bound function that accepts
 * `(code, config?)`. Use this to avoid repeating the tracer arg when tracing
 * multiple snippets with the same tracer.
 *
 * All validation and config prep is SYNCHRONOUS — errors throw immediately.
 * Only the final `record()` call is async.
 *
 * @param tracerModule - A valid `TracerModule` object
 * @param code - The source code / input string to trace
 * @param config - Optional config object with `{ meta?, options? }` structure
 * @returns Promise resolving to an array of trace steps
 *
 * @throws {TracerInvalidError} (sync) if `tracerModule` does not satisfy the contract
 * @throws {ArgumentInvalidError} (sync) if `code` is not a string
 * @throws {OptionsInvalidError} (sync) if schema validation fails
 * @throws {OptionsSemanticInvalidError} (sync) if `verifyOptions` constraint violated
 *
 * @example
 * ```typescript
 * // Direct call
 * const steps = await trace(myTracer, 'hello');
 *
 * // Curried — reuse tracer across calls
 * const traceWith = trace(myTracer);
 * const steps1 = await traceWith('hello');
 * const steps2 = await traceWith('world', { options: { direction: 'rl' } });
 * ```
 */
function trace(
  tracerModule: TracerModule,
  code: string,
  config?: unknown,
): Promise<readonly StepCore[]>;
function trace(
  tracerModule: TracerModule,
): (code: string, config?: unknown) => Promise<readonly StepCore[]>;
// eslint-disable-next-line sonarjs/function-return-type -- overload implementation must handle both signatures
function trace(
  tracerModule: TracerModule,
  code?: string,
  config?: unknown,
):
  | Promise<readonly StepCore[]>
  | ((code: string, config?: unknown) => Promise<readonly StepCore[]>) {
  // Validate tracer at every entry point (consistent guard)
  validateTracerModule(tracerModule);

  // Curry: when called with only tracerModule, return pre-bound function
  if (code === undefined) {
    return function traceWithTracer(
      _code: string,
      _config?: unknown,
    ): Promise<readonly StepCore[]> {
      return traceWith(tracerModule, _code, _config);
    };
  }

  return traceWith(tracerModule, code, config);
}

/**
 * Validates remaining args, prepares config, then delegates to record().
 */
function traceWith(
  tracerModule: TracerModule,
  code: string,
  config?: unknown,
): Promise<readonly StepCore[]> {
  // 1. Validate code type (sync)
  if (typeof code !== 'string') {
    throw new ArgumentInvalidError(
      'code',
      `trace: expected code to be a string, got ${typeof code}`,
    );
  }

  // 2. Validate config type (sync)
  if (config !== undefined && config !== null && typeof config !== 'object') {
    throw new ArgumentInvalidError(
      'config',
      `trace: expected config to be an object, got ${typeof config}`,
    );
  }

  // 3. Prepare meta config (sync)
  const userConfig = (config ?? {}) as {
    readonly meta?: unknown;
    readonly options?: unknown;
  };
  const meta = prepareConfig(userConfig.meta ?? {}, metaSchema) as MetaConfig;

  // 4. Prepare tracer options (sync) — skip if tracer has no schema
  const options = tracerModule.optionsSchema
    ? prepareConfig(userConfig.options ?? {}, tracerModule.optionsSchema as JSONSchema)
    : {};

  // Freeze resolvedConfig in place — we own meta + options (fresh from prepareConfig).
  // Pass the frozen object to tracer; same reference is used for both verifyOptions and record.
  const resolvedConfig = deepFreezeInPlace({ meta, options });

  // 5. Semantic validation (sync) — only if tracer exports verifyOptions
  tracerModule.verifyOptions?.(resolvedConfig.options);

  // 6. Record (async) — clone+freeze tracer output (tracer owns those step objects)
  return tracerModule.record(code, resolvedConfig).then(deepFreeze);
}

export default trace;
