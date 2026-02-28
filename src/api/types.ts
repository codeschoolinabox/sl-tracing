/**
 * @file Public API types for `@study-lenses/tracing`.
 *
 * All wrapper-specific types that consumers may need when annotating variables,
 * function parameters, or return types. Defined here (not in wrapper files) per
 * the codebase convention that types live in `<module>/types.ts`.
 *
 * @example
 * ```typescript
 * import type { EmbodifyChain, EmbodyResult, TracifyChain } from '@study-lenses/tracing';
 * ```
 */

import type EmbodyError from '../errors/embody-error.js';
import type { ResolvedConfig, StepCore, TracerModule } from '../types.js';

// ============================================================================
// embody types
// ============================================================================

/** Input for `embody()` and closure calls. All fields optional for partial application. */
export type EmbodyInput = {
  readonly tracer?: TracerModule;
  readonly code?: string;
  readonly config?: object;
};

/** Successful trace result from `embody()`. All fields populated after tracing. */
export type EmbodySuccess = {
  readonly ok: true;
  readonly steps: readonly StepCore[];
  readonly tracer: TracerModule;
  readonly code: string;
  readonly config: object | undefined;
  readonly resolvedConfig: ResolvedConfig;
};

/** Error result from `embody()`. Never throws — errors are captured here. */
export type EmbodyFailure = {
  readonly ok: false;
  readonly error: EmbodyError;
  readonly tracer: TracerModule;
  readonly code: string;
  readonly config: object | undefined;
};

/** Union of success and failure — discriminate on `.ok`. */
export type EmbodyResult = EmbodySuccess | EmbodyFailure;

/**
 * Callable closure returned by `embody()` when not all fields are provided.
 * Call it with remaining fields to complete the trace, or inspect its properties
 * to see what state has been accumulated so far.
 */
export type EmbodyClosure = {
  readonly ok: true;
  readonly error: undefined;
  readonly tracer: TracerModule | undefined;
  readonly code: string | undefined;
  readonly config: object | undefined;
  readonly steps: undefined;
} & ((remaining: EmbodyInput) => Promise<EmbodyResult> | EmbodyClosure);

// ============================================================================
// embodify types
// ============================================================================

/** Input for `embodify()` and `.set()`. All fields optional — set only what changed. */
export type EmbodifyInput = {
  readonly tracer?: TracerModule;
  readonly code?: string;
  readonly config?: object;
};

/** Input for `.trace()` — override one or more state fields for a single trace call. */
export type TraceMethodInput = {
  readonly tracer?: TracerModule;
  readonly code?: string;
  readonly config?: object;
};

/**
 * Immutable chain returned by `embodify()` and all chain methods.
 *
 * Accumulates state through `.set()`, executes through `.trace()`.
 * Each operation returns a NEW chain — existing chains are never mutated.
 * All errors are captured in `.error`; the chain never throws.
 */
export type EmbodifyChain = {
  readonly tracer: TracerModule | undefined;
  readonly code: string | undefined;
  readonly config: object | undefined;
  readonly resolvedConfig: ResolvedConfig | undefined;
  readonly steps: readonly StepCore[] | undefined;
  readonly ok: boolean | undefined;
  readonly error: EmbodyError | undefined;
  readonly set: (input: EmbodifyInput) => EmbodifyChain;
  readonly trace: (input?: TraceMethodInput) => Promise<EmbodifyChain>;
};

// ============================================================================
// tracify types
// ============================================================================

/**
 * Chainable builder returned by `tracify` and all chain methods.
 *
 * All validation is synchronous — errors throw immediately.
 * `.steps` is the only async property (it triggers the actual trace).
 */
export type TracifyChain = {
  tracer(tracerModule: TracerModule): TracifyChain;
  code(source: string): TracifyChain;
  config(cfg: unknown): TracifyChain;
  readonly steps: Promise<readonly StepCore[]>;
  readonly resolvedConfig: ResolvedConfig;
};
