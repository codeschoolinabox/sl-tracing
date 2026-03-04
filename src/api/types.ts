/**
 * @file Public API types for `@study-lenses/tracing`.
 *
 * All wrapper-specific types that consumers may need when annotating variables,
 * function parameters, or return types. Defined here (not in wrapper files) per
 * the codebase convention that types live in `<module>/types.ts`.
 *
 * @example
 * ```typescript
 * import type { EmbodifyChain, TracifyResult, EmbodyChain } from '@study-lenses/tracing';
 * ```
 */

import type TracingError from '../errors/tracing-error.js';
import type { ResolvedConfig, StepCore, TracerModule } from '../types.js';

// ============================================================================
// tracify types
// ============================================================================

/** Input for `tracify()` and closure calls. All fields optional for partial application. */
export type TracifyInput = {
  readonly tracer?: TracerModule;
  readonly code?: string;
  readonly config?: object;
};

/** Successful trace result from `tracify()`. All fields populated after tracing. */
export type TracifySuccess = {
  readonly ok: true;
  readonly steps: readonly StepCore[];
  readonly tracer: TracerModule;
  readonly code: string;
  readonly config: object | undefined;
  readonly resolvedConfig: ResolvedConfig;
};

/** Error result from `tracify()`. Never throws — errors are captured here. */
export type TracifyFailure = {
  readonly ok: false;
  readonly error: TracingError;
  readonly tracer: TracerModule;
  readonly code: string;
  readonly config: object | undefined;
};

/** Union of success and failure — discriminate on `.ok`. */
export type TracifyResult = TracifySuccess | TracifyFailure;

/**
 * Callable closure returned by `tracify()` when not all fields are provided.
 * Call it with remaining fields to complete the trace, or inspect its properties
 * to see what state has been accumulated so far.
 */
export type TracifyClosure = {
  readonly ok: true;
  readonly error: undefined;
  readonly tracer: TracerModule | undefined;
  readonly code: string | undefined;
  readonly config: object | undefined;
  readonly steps: undefined;
} & ((remaining: TracifyInput) => Promise<TracifyResult> | TracifyClosure);

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
  readonly error: TracingError | undefined;
  readonly set: (input: EmbodifyInput) => EmbodifyChain;
  readonly trace: (input?: TraceMethodInput) => Promise<EmbodifyChain>;
};

// ============================================================================
// embody types
// ============================================================================

/**
 * Chainable builder returned by `embody` and all chain methods.
 *
 * All validation is synchronous — errors throw immediately.
 * `.steps` is the only async property (it triggers the actual trace).
 */
export type EmbodyChain = {
  tracer(tracerModule: TracerModule): EmbodyChain;
  code(source: string): EmbodyChain;
  config(cfg: unknown): EmbodyChain;
  readonly steps: Promise<readonly StepCore[]>;
  readonly resolvedConfig: ResolvedConfig;
};
