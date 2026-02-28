/**
 * @file Domain types for @study-lenses/tracing
 *
 * Defines the shared contract between the API layer, tracer modules, and consumers.
 * All runtime-significant types for the package live here.
 *
 * Usage:
 *   import type { TracerModule, StepCore } from '../types.js';
 */

// ============================================================================
// Source Location (ESTree-compliant)
// ============================================================================

/**
 * ESTree-compliant source position.
 * @see https://github.com/estree/estree/blob/master/es5.md#node-objects
 */
export type Position = {
  /** 1-indexed line number (ESTree standard) */
  readonly line: number;
  /** 0-indexed column number (ESTree standard) */
  readonly column: number;
};

/**
 * ESTree-compliant source location with start and end positions.
 * @see https://github.com/estree/estree/blob/master/es5.md#node-objects
 */
export type SourceLocation = {
  /** Start position of the source range */
  readonly start: Position;
  /** End position of the source range */
  readonly end: Position;
};

// ============================================================================
// Step Types
// ============================================================================

/**
 * Core fields present in every step, regardless of language or tracer.
 * Enables visual correlation between steps and code/editor locations.
 *
 * @remarks
 * Tracer-specific steps extend this with additional fields (e.g. `char` for txt:chars,
 * `binding` for js:klve). The API layer returns `readonly StepCore[]`; consumers who
 * need tracer-specific fields import from the tracer package's types.
 */
export type StepCore = {
  /** 1-indexed execution order */
  readonly step: number;
  /** ESTree-compliant source location (line 1-indexed, column 0-indexed) */
  readonly loc: SourceLocation;
};

// ============================================================================
// Config Types
// ============================================================================

/**
 * Execution limits within MetaConfig.
 * All limits use `null` to mean "unlimited" (JSON Schema cannot represent Infinity).
 */
export type MetaLimits = {
  /** Maximum trace steps; null = unlimited */
  readonly steps: number | null;
  /** Maximum loop iterations; null = unlimited */
  readonly iterations: number | null;
  /** Maximum call stack depth; null = unlimited */
  readonly callstack: number | null;
  /** Maximum execution time in ms; null = unlimited */
  readonly time: number | null;
};

/**
 * Cross-language execution limits and debugging options.
 * Validated against `meta-schema.ts` (frozen wrapper around `meta.schema.json`) before being passed to tracers.
 */
export type MetaConfig = {
  /** Execution limits */
  readonly max: MetaLimits;
  /** Line range to trace [start, end]; null = full code */
  readonly range: readonly [number, number] | null;
  /** Whether to include timestamps in trace steps */
  readonly timestamps: boolean;
  /** Debug options */
  readonly debug: { readonly ast: boolean };
};

/**
 * Fully resolved config passed to every tracer's `record` function.
 * Contains both meta limits and tracer-specific options (all with defaults filled).
 *
 * @remarks
 * Tracers receive FULLY FILLED config — never partial, never undefined fields.
 * Tracers can trust this completely and focus on pure tracing logic.
 */
export type ResolvedConfig = {
  /** Execution limits (fully filled, defaults applied) */
  readonly meta: MetaConfig;
  /** Tracer-specific resolved options (with defaults filled) */
  readonly options: Record<string, unknown>;
};

// ============================================================================
// Tracer Contract
// ============================================================================

/**
 * The tracing function signature every tracer must implement.
 *
 * Previously named `TracerModule` in embody — renamed to `RecordFunction` to avoid
 * confusion with the new `TracerModule` object type.
 *
 * @remarks
 * Async for consistency across all tracers:
 * - Some tracers (txt:chars) are internally sync but return Promise for API consistency
 * - Other tracers (Python via Pyodide, js:klve with Aran) are genuinely async
 */
export type RecordFunction<TOptions = unknown, TStep extends StepCore = StepCore> = (
  code: string,
  config: { readonly meta: MetaConfig; readonly options: TOptions },
) => Promise<readonly TStep[]>;

/**
 * The object every tracer package must export.
 * Pass this to `tracing(tracerModule)` to get the four pre-bound API wrappers.
 *
 * @example
 * ```typescript
 * // In a tracer package:
 * const tracerModule: TracerModule = { id, langs, record, optionsSchema, verifyOptions };
 * export default tracerModule;
 * ```
 *
 * @remarks
 * `id` is the cache-invalidation key — used to detect when a tracer has changed in
 * chainable APIs (`tracify`, `embodify`). Must be unique across your tracer ecosystem.
 *
 * `langs` declares which file extensions this tracer supports. Chainable APIs use it
 * to decide whether to keep or discard the current code when switching tracers:
 * - Empty array `[]` = universal tracer — compatible with any language
 * - Intersection with previous tracer's langs = keep code
 * - No intersection = discard code (incompatible language families)
 */
export type TracerModule = {
  /** Unique tracer ID, e.g. `'js:klve'` or `'txt:chars'` — used as cache-invalidation key */
  readonly id: string;
  /**
   * Supported file extensions (without leading dot), e.g. `['js', 'mjs', 'cjs']`.
   * Use `Object.freeze([...])` when defining. Use `[]` for universal tracers.
   */
  readonly langs: Readonly<readonly string[]>;
  /** The tracing function — receives code + fully resolved config, returns steps */
  readonly record: RecordFunction;
  /** JSON Schema for tracer-specific options (omit if tracer has no options) */
  readonly optionsSchema?: Readonly<Record<string, unknown>>;
  /**
   * Semantic validation for cross-field constraints — called after schema validation.
   * Throw `OptionsSemanticInvalidError` if constraints are violated.
   * Omit if no cross-field constraints exist.
   */
  readonly verifyOptions?: (options: unknown) => void;
};
