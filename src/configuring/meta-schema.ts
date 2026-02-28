/**
 * @file Deep-frozen meta schema for internal use.
 *
 * Wraps `meta.schema.json` (kept as canonical JSON Schema for external tooling)
 * with deep-freeze for runtime immutability.
 *
 * Internal code imports this wrapper — never the raw JSON directly.
 * The `as JSONSchema` cast is centralized here so call sites don't need it.
 */

import deepFreeze from '../utils/deep-freeze.js';

import rawMetaSchema from './meta.schema.json' with { type: 'json' };
import type { JSONSchema } from './types.js';

/**
 * Deep-frozen JSON Schema for `meta` config validation (execution limits).
 *
 * Used internally by all four API wrappers to validate and fill `meta` config.
 * Exported for external tooling — e.g., display available limit fields in a UI,
 * or pre-validate config before calling a wrapper.
 *
 * @see {@link MetaConfig} for the TypeScript type this schema produces
 * @see {@link MetaLimits} for the limits sub-object shape
 */
const metaSchema: JSONSchema = deepFreeze(rawMetaSchema as JSONSchema);

export default metaSchema;
