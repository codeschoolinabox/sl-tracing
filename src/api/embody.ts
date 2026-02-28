/**
 * @file Safe tracing with Result pattern (ok/error) and partial application.
 *
 * Returns `Promise<EmbodyResult>` when all 3 fields are provided.
 * Returns `EmbodyClosure` (callable with remaining fields) when fields are missing.
 *
 * Never throws — all errors (including TracerInvalidError) are returned as
 * `{ ok: false, error }` results.
 *
 * @example
 * ```typescript
 * // All at once
 * const result = await embody({ tracer: myTracer, code: 'ab', config: {} });
 * if (result.ok) console.log(result.steps);
 *
 * // Partial application
 * const withTracer = embody({ tracer: myTracer });
 * const result = await withTracer({ code: 'ab', config: {} });
 * ```
 */

import metaSchema from '../configuring/meta-schema.js';
import prepareConfig from '../configuring/prepare-config.js';
import type { JSONSchema } from '../configuring/types.js';
import EmbodyError from '../errors/embody-error.js';
import InternalError from '../errors/internal-error.js';
import type { MetaConfig, TracerModule } from '../types.js';
import deepFreezeInPlace from '../utils/deep-freeze-in-place.js';
import deepFreeze from '../utils/deep-freeze.js';

import type { EmbodyClosure, EmbodyInput, EmbodyResult } from './types.js';
import validateTracerModule from './validate-tracer-module.js';

/**
 * Executes trace with prepared state.
 * All errors — including TracerInvalidError — are caught and returned as
 * `{ ok: false }` results. Never throws.
 */
async function executeTrace(
  tracer: TracerModule,
  code: string,
  config: object | undefined,
): Promise<EmbodyResult> {
  try {
    // 1. Validate tracer shape (TracerInvalidError extends EmbodyError — caught below)
    validateTracerModule(tracer);

    // 2. Prepare config
    const userConfig = (config ?? {}) as {
      readonly meta?: Readonly<Record<string, unknown>>;
      readonly options?: Readonly<Record<string, unknown>>;
    };
    const meta = prepareConfig(userConfig.meta ?? {}, metaSchema) as MetaConfig;
    const options = tracer.optionsSchema
      ? (prepareConfig(userConfig.options ?? {}, tracer.optionsSchema as JSONSchema) as Record<
          string,
          unknown
        >)
      : {};

    // deepFreezeInPlace: meta + options are fresh from prepareConfig — we own them.
    // Pass the frozen object to tracer; same reference echoed back in result.
    const resolvedConfig = deepFreezeInPlace({ meta, options });

    // 3. Semantic validation
    tracer.verifyOptions?.(resolvedConfig.options);

    // 4. Record — deepFreeze: clone+freeze tracer output (tracer owns those step objects)
    const steps = deepFreeze(await tracer.record(code, resolvedConfig));

    // deepFreezeInPlace: we just built this result wrapper — freeze in place
    return deepFreezeInPlace({
      ok: true as const,
      steps,
      tracer,
      code,
      config,
      resolvedConfig,
    });
  } catch (caughtError) {
    if (caughtError instanceof EmbodyError) {
      return { ok: false as const, error: caughtError, tracer, code, config };
    }
    const message = caughtError instanceof Error ? caughtError.message : String(caughtError);
    const cause = caughtError instanceof Error ? caughtError : undefined;
    return {
      ok: false as const,
      error: new InternalError(message, { cause }),
      tracer,
      code,
      config,
    };
  }
}

/**
 * Creates a closure with attached state properties.
 */
function createClosure(state: {
  readonly tracer: TracerModule | undefined;
  readonly code: string | undefined;
  readonly config: object | undefined;
}): EmbodyClosure {
  // eslint-disable-next-line sonarjs/function-return-type -- Intentional: curried function
  function closure(remaining: EmbodyInput = {}): Promise<EmbodyResult> | EmbodyClosure {
    const tracer = remaining.tracer ?? state.tracer;
    const code = remaining.code ?? state.code;
    // deepFreeze: user-supplied config — we don't own it, clone+freeze before storing
    const config = remaining.config === undefined ? state.config : deepFreeze(remaining.config);

    if (tracer !== undefined && typeof code === 'string' && config !== undefined) {
      return executeTrace(tracer, code, config);
    }

    return createClosure({ tracer, code, config });
  }

  // eslint-disable-next-line functional/immutable-data -- Intentional: decorating closure
  Object.defineProperties(closure, {
    ok: { value: true, enumerable: true },
    error: { value: undefined, enumerable: true },
    tracer: { value: state.tracer, enumerable: true },
    code: { value: state.code, enumerable: true },
    // config is already frozen (deepFreeze on entry) — return as-is
    config: { value: state.config, enumerable: true },
    steps: { value: undefined, enumerable: true },
  });

  return closure as EmbodyClosure;
}

/**
 * Safe tracing with partial application. Result pattern — never throws.
 *
 * - All 3 fields present (`tracer`, `code`, `config`) → returns `Promise<EmbodyResult>`
 * - Any field missing → returns `EmbodyClosure` for further partial application
 *
 * @param input - Fields to provide now. All are optional; missing fields keep the closure open.
 *   - `tracer` — a valid `TracerModule` object
 *   - `code` — source code / input string to trace
 *   - `config` — `{ meta?, options? }` config object. Pass `{}` for defaults.
 *     `undefined` = "not yet provided" (returns closure); `{}` = "use defaults" (proceeds).
 * @returns `Promise<EmbodyResult>` when all 3 fields are set; `EmbodyClosure` otherwise
 *
 * @remarks
 * **Never throws.** All errors — including `TracerInvalidError` — are caught and returned
 * as `{ ok: false, error }`. Safe to use in production without try-catch.
 *
 * @example
 * ```typescript
 * // All at once
 * const result = await embody({ tracer: myTracer, code: 'hello', config: {} });
 * if (result.ok) console.log(result.steps);
 *
 * // Partial application — build up state across call sites
 * const withTracer = embody({ tracer: myTracer });
 * const result = await withTracer({ code: 'hello', config: {} });
 * ```
 */

function embody(input: EmbodyInput = {}): Promise<EmbodyResult> | EmbodyClosure {
  const { tracer, code, config } = input;
  // deepFreeze: user-supplied config — we don't own it, clone+freeze before storing
  const frozenConfig = config === undefined ? undefined : deepFreeze(config);

  if (tracer !== undefined && typeof code === 'string' && frozenConfig !== undefined) {
    return executeTrace(tracer, code, frozenConfig);
  }

  return createClosure({ tracer, code, config: frozenConfig });
}

export default embody;
