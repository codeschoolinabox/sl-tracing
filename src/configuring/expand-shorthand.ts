/**
 * @file Expands boolean shorthand to full object structure.
 *
 * Detects when user passes a boolean where schema expects an object with
 * all-boolean properties, and expands it to the full structure.
 *
 * @example
 * // Input: { allowedCharClasses: false }
 * // Output: { allowedCharClasses: { lowercase: false, uppercase: false, ... } }
 */

import type { JSONSchema } from './types.js';

/**
 * Expands boolean shorthand in options to full object structure.
 *
 * Detection heuristic: A field supports shorthand if the schema expects
 * an object where all properties are booleans, but the user provided a boolean.
 *
 * @param options - User-provided options (may use boolean shorthand)
 * @param schema - JSON Schema defining expected structure
 * @returns New options object with shorthand expanded (never mutates input)
 */
function expandShorthand(options: unknown, schema: JSONSchema): unknown {
  // Handle null/undefined gracefully
  if (options === null || options === undefined) {
    return {};
  }

  // Must be an object to process
  if (typeof options !== 'object') {
    return options;
  }

  const schemaProperties = schema.properties ?? {};
  const entries = Object.entries(options as Record<string, unknown>);

  // Map each entry, expanding shorthand where applicable
  const expandedEntries = entries.map(([key, value]) =>
    typeof value === 'boolean' && shouldExpand(schemaProperties[key])
      ? [key, expandBoolean(value, schemaProperties[key])]
      : [key, value],
  );

  return Object.fromEntries(expandedEntries);
}

/**
 * Checks if a field schema supports boolean shorthand.
 * True if schema expects object with all-boolean properties.
 */
function shouldExpand(fieldSchema: JSONSchema | undefined): boolean {
  if (!fieldSchema) return false;
  if (fieldSchema.type !== 'object') return false;

  const { properties } = fieldSchema;
  if (!properties) return false;

  // All properties must be booleans
  return Object.values(properties).every((property) => property.type === 'boolean');
}

/**
 * Expands a boolean to an object with all properties set to that value.
 */
function expandBoolean(value: boolean, fieldSchema: JSONSchema): Record<string, boolean> {
  const properties = fieldSchema.properties ?? {};
  const entries = Object.keys(properties).map((key) => [key, value]);
  return Object.fromEntries(entries) as Record<string, boolean>;
}

export default expandShorthand;
