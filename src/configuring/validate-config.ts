/**
 * @file Validates config data against JSON Schema.
 *
 * Returns data on success (enables piping), throws on failure.
 * Collects all validation errors, not just the first.
 */

import OptionsInvalidError from '../errors/options-invalid-error.js';

import Ajv from './ajv.js';
import type { JSONSchema } from './types.js';

/** Configured Ajv instance for validation */
const ajv = new Ajv({
  allErrors: true,
  strict: false,
});

/**
 * Validates data against JSON Schema.
 *
 * @param data - Data to validate
 * @param schema - JSON Schema to validate against
 * @returns Same data reference on success (enables piping)
 * @throws OptionsInvalidError when validation fails
 */
function validateConfig(data: unknown, schema: JSONSchema): unknown {
  // Handle null/undefined as empty object
  const input = data === null || data === undefined ? {} : data;

  const validate = ajv.compile(schema);
  const valid = validate(input);

  if (!valid && validate.errors) {
    const errors = validate.errors as readonly AjvError[];
    const messages = errors.map((error) => formatError(error));
    const combined = messages.join('; ');
    const firstError = errors[0];
    const firstPath = getErrorPath(firstError);
    throw new OptionsInvalidError(combined, firstPath);
  }

  return input;
}

type AjvError = {
  readonly instancePath?: string;
  readonly dataPath?: string;
  readonly message?: string;
  readonly params?: {
    readonly missingProperty?: string;
    readonly allowedValues?: readonly unknown[];
  };
};

/**
 * Extracts property path from Ajv error.
 * Handles both instancePath (Ajv 8+) and dataPath (older Ajv).
 */
function getErrorPath(error: AjvError | undefined): string {
  if (!error) return '';
  // Ajv 8+ uses instancePath with /prefix, older uses dataPath with .prefix
  const rawPath = error.instancePath ?? error.dataPath ?? '';
  const missingProperty = error.params?.missingProperty ?? '';
  // Strip leading / or . from path
  const cleanPath = rawPath.replace(/^[./]/, '');
  return cleanPath || missingProperty || '';
}

/**
 * Formats an Ajv error into a human-readable message.
 */
function formatError(error: AjvError): string {
  const path = getErrorPath(error) || 'config';
  const message = error.message ?? 'validation failed';

  // Handle enum errors specially to list allowed values
  if (error.params?.allowedValues) {
    const allowed = error.params.allowedValues;
    return `${path} must be one of: ${(allowed as readonly string[]).join(', ')}`;
  }

  return `${path} ${message}`;
}

export default validateConfig;
