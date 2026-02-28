/**
 * @file Chainable tracing with immutable state and Result pattern.
 *
 * Accumulates state through `.set()`, executes through `.trace()`.
 * Each operation returns a NEW chain (fully immutable state).
 * Errors are returned as `{ ok: false }` results — never thrown.
 *
 * @example
 * ```typescript
 * const chain = await embodify({ tracer: myTracer })
 *   .set({ code: 'hello' })
 *   .trace();
 *
 * if (chain.ok) console.log(chain.steps);
 * ```
 */

import metaSchema from '../configuring/meta-schema.js';
import prepareConfig from '../configuring/prepare-config.js';
import type { JSONSchema } from '../configuring/types.js';
import ArgumentInvalidError from '../errors/argument-invalid-error.js';
import EmbodyError from '../errors/embody-error.js';
import InternalError from '../errors/internal-error.js';
import type { MetaConfig, ResolvedConfig, StepCore, TracerModule } from '../types.js';
import deepFreezeInPlace from '../utils/deep-freeze-in-place.js';
import deepFreeze from '../utils/deep-freeze.js';

import type { EmbodifyChain, EmbodifyInput, TraceMethodInput } from './types.js';
import validateTracerModule from './validate-tracer-module.js';

/**
 * Immutable chain state — internal only, not exposed publicly.
 * `resolvedConfig` and `steps` are result fields set by `.trace()`, never mutated in place.
 */
type EmbodifyState = {
  readonly tracer: TracerModule | undefined;
  readonly code: string | undefined;
  readonly config: object | undefined;
  readonly resolvedConfig: ResolvedConfig | undefined;
  readonly steps: readonly StepCore[] | undefined;
  readonly ok: boolean | undefined;
  readonly error: EmbodyError | undefined;
};

/**
 * Creates an immutable chain with lazy `resolvedConfig` computation.
 * All state fields are readonly; the `resolvedConfig` getter uses a closure
 * `let` variable (seeded from `state.resolvedConfig`) to avoid recomputing.
 */
function embodifyChain(state: EmbodifyState): EmbodifyChain {
  // Lazy cache for resolvedConfig — seeded from state (enables reuse across .set() calls
  // that don't change tracer/config) without mutating state.
  let cachedResolvedConfig: ResolvedConfig | undefined = state.resolvedConfig;

  // Shallow freeze: prevents method reassignment without invoking getter side effects
  // (deep freeze would call Object.values(), which triggers getters — some throw if tracer/code unset)
  return Object.freeze({
    get tracer() {
      return state.tracer;
    },
    get code() {
      return state.code;
    },
    get config() {
      // config is frozen on entry — return as-is
      return state.config;
    },
    get resolvedConfig() {
      // Compute and cache on first access if not already cached and tracer is set
      if (!cachedResolvedConfig && state.tracer !== undefined) {
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
      return cachedResolvedConfig;
    },
    get steps() {
      // steps are frozen on entry — return as-is
      return state.steps;
    },
    get ok() {
      return state.ok;
    },
    get error() {
      return state.error;
    },

    /**
     * Sets one or more fields and returns a new chain with smart cache invalidation.
     *
     * **Cache invalidation rules**:
     * - Tracer change → clears config, resolvedConfig, steps; code cleared if langs incompatible
     * - Code change → clears steps only
     * - Config change → clears resolvedConfig, steps
     *
     * @param input - Fields to update
     */
    set(input: EmbodifyInput): EmbodifyChain {
      const newTracer = input.tracer ?? state.tracer;
      const tracerChanged = newTracer?.id !== state.tracer?.id;

      let newCode = input.code ?? state.code;
      if (tracerChanged && newTracer !== undefined) {
        // Extract oldLangsCount to avoid chained ?. and ?? operators in the expression below
        const oldLangsCount = state.tracer?.langs.length ?? 0;
        const langsCompatible =
          newTracer.langs.length === 0 ||
          oldLangsCount === 0 ||
          newTracer.langs.some((l) => state.tracer?.langs.includes(l));
        if (!langsCompatible) {
          newCode = input.code;
        }
      }

      const codeChanged = newCode !== state.code;
      const newConfig =
        input.tracer !== undefined && input.config === undefined
          ? undefined
          : (input.config ?? state.config);
      const configChanged =
        input.config !== undefined && JSON.stringify(input.config) !== JSON.stringify(state.config);

      return embodifyChain({
        tracer: newTracer,
        code: newCode,
        // deepFreeze: config may be user-supplied — clone before storing
        config: newConfig === undefined ? undefined : deepFreeze(newConfig),
        resolvedConfig: tracerChanged || configChanged ? undefined : state.resolvedConfig,
        steps: tracerChanged || codeChanged || configChanged ? undefined : state.steps,
        ok: true,
        error: undefined,
      });
    },

    async trace(input: TraceMethodInput = {}): Promise<EmbodifyChain> {
      const tracer = input.tracer ?? state.tracer;
      const code = input.code ?? state.code;
      const tracerChanged = tracer?.id !== state.tracer?.id;
      const configChanged =
        input.config !== undefined && JSON.stringify(input.config) !== JSON.stringify(state.config);
      // deepFreeze: user-supplied config — we don't own it, clone before storing; pass through existing frozen state.config
      const config = input.config === undefined ? state.config : deepFreeze(input.config);

      if (tracer === undefined) {
        return embodifyChain({
          tracer: undefined,
          code,
          config,
          resolvedConfig: undefined,
          steps: undefined,
          ok: false,
          error: new ArgumentInvalidError('tracer', 'embodify: tracer is required'),
        });
      }

      if (code === undefined) {
        return embodifyChain({
          tracer,
          code: undefined,
          config,
          resolvedConfig: undefined,
          steps: undefined,
          ok: false,
          error: new ArgumentInvalidError('code', 'embodify: code is required'),
        });
      }

      try {
        // Validate tracer shape (TracerInvalidError extends EmbodyError — caught below)
        validateTracerModule(tracer);

        let resolvedConfig: ResolvedConfig;

        if (!cachedResolvedConfig || tracerChanged || configChanged) {
          const userConfig = (config ?? {}) as {
            readonly meta?: Readonly<Record<string, unknown>>;
            readonly options?: Readonly<Record<string, unknown>>;
          };
          const meta = prepareConfig(userConfig.meta ?? {}, metaSchema) as MetaConfig;
          const options = tracer.optionsSchema
            ? (prepareConfig(
                userConfig.options ?? {},
                tracer.optionsSchema as JSONSchema,
              ) as Record<string, unknown>)
            : {};
          // deepFreezeInPlace: meta + options are fresh from prepareConfig — we own them
          resolvedConfig = deepFreezeInPlace({ meta, options });
          tracer.verifyOptions?.(resolvedConfig.options);
        } else {
          resolvedConfig = cachedResolvedConfig;
        }

        // deepFreeze: steps come from tracer — we don't own them, clone before storing
        const steps = deepFreeze(await tracer.record(code, resolvedConfig));
        return embodifyChain({
          tracer,
          code,
          config,
          resolvedConfig,
          steps,
          ok: true,
          error: undefined,
        });
      } catch (caughtError) {
        if (caughtError instanceof EmbodyError) {
          return embodifyChain({
            tracer,
            code,
            config,
            resolvedConfig: undefined,
            steps: undefined,
            ok: false,
            error: caughtError,
          });
        }
        const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
        return embodifyChain({
          tracer,
          code,
          config,
          resolvedConfig: undefined,
          steps: undefined,
          ok: false,
          error: new InternalError(message),
        });
      }
    },
  }) as EmbodifyChain;
}

/**
 * Creates an immutable chainable builder with optional initial state.
 *
 * Accumulate state through {@link EmbodifyChain.set}; execute through
 * {@link EmbodifyChain.trace}. Each `.set()` returns a NEW chain — state is never mutated.
 * Errors from `.trace()` are returned as `{ ok: false }` — never thrown.
 *
 * @param input - Initial state fields (all optional). `{ tracer?, code?, config? }`
 * @returns A new `EmbodifyChain` with the provided initial state
 *
 * @remarks
 * No validation at creation — `.trace()` handles all validation. This means you can
 * create a chain with no fields and populate them via `.set()` before tracing.
 *
 * @example
 * ```typescript
 * const chain = await embodify({ tracer: myTracer })
 *   .set({ code: 'hello' })
 *   .trace();
 *
 * if (chain.ok) console.log(chain.steps);
 *
 * // Re-trace with new code — chain is immutable, original unaffected
 * const chain2 = await chain.set({ code: 'world' }).trace();
 * ```
 */
function embodify(input: EmbodifyInput = {}): EmbodifyChain {
  const { tracer, code, config } = input;
  return embodifyChain({
    tracer,
    code,
    // deepFreeze: user-supplied config — we don't own it, clone before storing
    config: config === undefined ? undefined : deepFreeze(config),
    resolvedConfig: undefined,
    steps: undefined,
    ok: true,
    error: undefined,
  });
}

export default embodify;
