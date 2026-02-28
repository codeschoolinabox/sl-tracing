/**
 * @file Chainable tracing API that throws on errors.
 *
 * Provides fluent interface for building trace configuration.
 * All validation is SYNCHRONOUS — errors throw immediately.
 * Only `.steps` (the final record call) is async.
 *
 * @example
 * ```typescript
 * // Direct usage
 * const steps = await tracify.tracer(myTracer).code('hello').steps;
 *
 * // Via tracing() sugar
 * const { tracify } = tracing(myTracer);
 * const steps = await tracify.code('hello').steps;
 * ```
 */

import metaSchema from '../configuring/meta-schema.js';
import prepareConfig from '../configuring/prepare-config.js';
import type { JSONSchema } from '../configuring/types.js';
import ArgumentInvalidError from '../errors/argument-invalid-error.js';
import type { MetaConfig, ResolvedConfig, StepCore, TracerModule } from '../types.js';
import deepFreezeInPlace from '../utils/deep-freeze-in-place.js';
import deepFreeze from '../utils/deep-freeze.js';

import type { TracifyChain } from './types.js';
import validateTracerModule from './validate-tracer-module.js';

/**
 * Immutable input state for a tracify chain — internal only, not exposed publicly.
 * Per-instance computation cache lives in local `let` variables inside `tracifyChain()`,
 * not here — keeps state type fully readonly.
 */
type TracifyState = {
  readonly tracer?: TracerModule | undefined;
  readonly code?: string | undefined;
  readonly config?: unknown;
};

/**
 * Creates a chain with the given state.
 * Each method returns a new chain instance, invalidating per-instance cache.
 */
function tracifyChain(state: TracifyState = {}): TracifyChain {
  // Per-instance cache — mutable let variables, not on state (keeps state fully readonly)
  let cachedResolvedConfig: ResolvedConfig | undefined;
  let cachedSteps: Promise<readonly StepCore[]> | undefined;

  // Shallow freeze: prevents method reassignment without invoking getter side effects
  return Object.freeze({
    /**
     * Sets the tracer and returns a new chain.
     *
     * **Cache invalidation**: always clears config; clears code only when the new
     * tracer is incompatible with the current one (different language family and
     * neither is universal).
     *
     * @param _tracer - A valid `TracerModule` object
     * @throws {TracerInvalidError} if `_tracer` does not satisfy the TracerModule contract
     */
    tracer(_tracer: TracerModule): TracifyChain {
      validateTracerModule(_tracer);
      // Extract oldLangsCount to avoid chained ?. and ?? operators in the expression below
      const oldLangsCount = state.tracer?.langs.length ?? 0;
      const langsCompatible =
        _tracer.langs.length === 0 ||
        oldLangsCount === 0 ||
        _tracer.langs.some((l) => state.tracer?.langs.includes(l));
      const keepCode = _tracer.id === state.tracer?.id || langsCompatible;
      return tracifyChain({
        tracer: _tracer,
        code: keepCode ? state.code : undefined,
        config: undefined,
      });
    },

    /**
     * Sets the code and returns a new chain.
     *
     * @param _code - Source code to trace
     * @throws {ArgumentInvalidError} if code is not a non-empty string
     */
    code(_code: string): TracifyChain {
      if (typeof _code !== 'string') {
        throw new ArgumentInvalidError(
          'code',
          `tracify.code(): expected a string, got ${typeof _code}`,
        );
      }
      if (_code === '') {
        throw new ArgumentInvalidError('code', 'tracify.code(): expected a non-empty string');
      }
      return tracifyChain({ ...state, code: _code });
    },

    /**
     * Sets the config and returns a new chain.
     *
     * @param _config - Config object with optional `meta` and `options` fields
     * @throws {ArgumentInvalidError} if config is not an object
     */
    config(_config: unknown): TracifyChain {
      if (_config !== null && typeof _config !== 'object') {
        throw new ArgumentInvalidError(
          'config',
          `tracify.config(): expected an object, got ${typeof _config}`,
        );
      }
      // deepFreeze: user-supplied config — we don't own it, clone before storing
      return tracifyChain({ ...state, config: deepFreeze(_config ?? {}) });
    },

    /**
     * Executes the trace and resolves to the array of steps.
     * Memoized per chain instance: computed once on first access, cached thereafter.
     *
     * @throws {ArgumentInvalidError} (sync) if tracer or code is not set
     * @throws {OptionsInvalidError} (sync) if schema validation fails
     * @throws {OptionsSemanticInvalidError} (sync) if verifyOptions constraint violated
     */
    get steps(): Promise<readonly StepCore[]> {
      // Return cached frozen steps directly — no re-clone needed (already frozen)
      if (cachedSteps) return cachedSteps;

      if (state.tracer === undefined) {
        throw new ArgumentInvalidError(
          'tracer',
          'tracify: a tracer is required to generate trace steps',
        );
      }
      if (state.code === undefined) {
        throw new ArgumentInvalidError('code', 'tracify: code is required to generate trace steps');
      }

      if (!cachedResolvedConfig) {
        const userConfig = (state.config ?? {}) as {
          readonly meta?: unknown;
          readonly options?: unknown;
        };
        const meta = prepareConfig(userConfig.meta ?? {}, metaSchema) as MetaConfig;
        const options = state.tracer.optionsSchema
          ? (prepareConfig(
              userConfig.options ?? {},
              state.tracer.optionsSchema as JSONSchema,
            ) as Record<string, unknown>)
          : {};
        // deepFreezeInPlace: meta + options are fresh from prepareConfig — we own them
        cachedResolvedConfig = deepFreezeInPlace({ meta, options });
      }

      state.tracer.verifyOptions?.(cachedResolvedConfig.options);
      // deepFreeze: clone+freeze tracer output — tracer owns those step objects
      cachedSteps = state.tracer.record(state.code, cachedResolvedConfig).then(deepFreeze);
      return cachedSteps;
    },

    /**
     * Resolves config synchronously without tracing.
     * Memoized per chain instance.
     *
     * @throws {ArgumentInvalidError} (sync) if tracer is not set
     * @throws {OptionsInvalidError} (sync) if schema validation fails
     * @throws {OptionsSemanticInvalidError} (sync) if verifyOptions constraint violated
     */
    get resolvedConfig(): ResolvedConfig {
      // Return cached frozen resolvedConfig directly — no re-clone needed (already frozen)
      if (cachedResolvedConfig) return cachedResolvedConfig;

      if (state.tracer === undefined) {
        throw new ArgumentInvalidError(
          'tracer',
          'tracify: tracer is required to access the resolved config',
        );
      }

      const userConfig = (state.config ?? {}) as {
        readonly meta?: unknown;
        readonly options?: unknown;
      };
      const meta = prepareConfig(userConfig.meta ?? {}, metaSchema) as MetaConfig;
      const options = state.tracer.optionsSchema
        ? (prepareConfig(
            userConfig.options ?? {},
            state.tracer.optionsSchema as JSONSchema,
          ) as Record<string, unknown>)
        : {};
      // deepFreezeInPlace: meta + options are fresh from prepareConfig — we own them
      cachedResolvedConfig = deepFreezeInPlace({ meta, options });
      state.tracer.verifyOptions?.(cachedResolvedConfig.options);
      return cachedResolvedConfig;
    },
  }) as TracifyChain;
}

/**
 * Pre-instantiated chainable builder for trace-throws API.
 *
 * Build state through `.tracer()`, `.code()`, `.config()`, then await `.steps`.
 * All validation is SYNCHRONOUS — errors throw immediately.
 * Only `.steps` (the final `record()` call) is async.
 *
 * Typically used via {@link tracing} which returns a chain with the tracer pre-set
 * (no need to call `.tracer()` manually).
 *
 * @throws {TracerInvalidError} `.tracer()` — if TracerModule contract violated
 * @throws {ArgumentInvalidError} `.code()` — if code is not a non-empty string
 * @throws {ArgumentInvalidError} `.config()` — if config is not an object
 * @throws {ArgumentInvalidError} `.steps` — if tracer or code not set
 * @throws {OptionsInvalidError} `.steps` — if meta or options fail JSON Schema validation
 * @throws {OptionsSemanticInvalidError} `.steps` — if verifyOptions constraint violated
 *
 * @example
 * ```typescript
 * // Direct usage
 * const steps = await tracify.tracer(myTracer).code('hello').steps;
 *
 * // Via tracing() — tracer pre-set
 * const { tracify } = tracing(myTracer);
 * const steps = await tracify.code('hello').steps;
 * ```
 */
const tracify: TracifyChain = tracifyChain({});
export default tracify;
