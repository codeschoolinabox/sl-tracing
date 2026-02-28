/**
 * @file Entry point for `@study-lenses/tracing`.
 *
 * Default export: `tracing(tracerModule)` — validates a TracerModule once and returns
 * four pre-bound API wrappers as a frozen object.
 *
 * Named exports: all four wrappers, all error classes, domain types, and metaSchema.
 *
 * @example
 * ```typescript
 * import tracing from '@study-lenses/tracing';
 * import myTracer from '@study-lenses/trace-js-klve';
 *
 * const { trace, tracify, embody, embodify } = tracing(myTracer);
 * const steps = await trace('hello');
 * ```
 */

// ============================================================================
// Default Export — primary API entry point
// ============================================================================

export { default } from './tracing.js';

// ============================================================================
// Named API Wrappers
// ============================================================================

export { default as tracing } from './tracing.js';
export { default as trace } from './api/trace.js';
export { default as tracify } from './api/tracify.js';
export { default as embody } from './api/embody.js';
export { default as embodify } from './api/embodify.js';

// ============================================================================
// Error Classes (for instanceof checks and catch clauses)
// ============================================================================

export { default as EmbodyError } from './errors/embody-error.js';
export { default as TracerInvalidError } from './errors/tracer-invalid-error.js';
export { default as ArgumentInvalidError } from './errors/argument-invalid-error.js';
export { default as OptionsInvalidError } from './errors/options-invalid-error.js';
export { default as OptionsSemanticInvalidError } from './errors/options-semantic-invalid-error.js';
export { default as LimitExceededError } from './errors/limit-exceeded-error.js';
export { default as ParseError } from './errors/parse-error.js';
export { default as RuntimeError } from './errors/runtime-error.js';
export { default as InternalError } from './errors/internal-error.js';

// ============================================================================
// Domain Types
// ============================================================================

export type {
  TracerModule,
  RecordFunction,
  StepCore,
  Position,
  SourceLocation,
  MetaConfig,
  MetaLimits,
  ResolvedConfig,
} from './types.js';

export type { SourceLoc } from './errors/types.js';

// ============================================================================
// Wrapper-Specific Types (for annotating variables and function parameters)
// ============================================================================

export type {
  EmbodyInput,
  EmbodyClosure,
  EmbodyResult,
  EmbodySuccess,
  EmbodyFailure,
  EmbodifyInput,
  TraceMethodInput,
  EmbodifyChain,
  TracifyChain,
} from './api/types.js';

// ============================================================================
// Schema (for building compatible config objects)
// ============================================================================

export { default as metaSchema } from './configuring/meta-schema.js';
