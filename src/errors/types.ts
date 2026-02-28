/**
 * @file Shared types for error classes.
 *
 * Contains type definitions used by multiple error classes.
 * Error classes themselves are in separate files (one per class).
 */

/**
 * Source code location for errors that occur at a specific point in code.
 *
 * Used by ParseError and RuntimeError to indicate where the error occurred.
 * ESTree-compliant: line is 1-indexed, column is 0-indexed.
 *
 * @see https://github.com/estree/estree/blob/master/es5.md#node-objects
 */
type SourceLoc = {
  /** 1-indexed line number (ESTree standard) */
  readonly line: number;
  /** 0-indexed column number (ESTree standard) */
  readonly column: number;
};

export type { SourceLoc };
