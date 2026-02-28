import EmbodyError from '../embody-error.js';
import ParseError from '../parse-error.js';

describe('ParseError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new ParseError('Unexpected token', { line: 1, column: 5 });
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of EmbodyError', () => {
      const error = new ParseError('Unexpected token', { line: 1, column: 5 });
      expect(error).toBeInstanceOf(EmbodyError);
    });

    it('is an instance of ParseError', () => {
      const error = new ParseError('Unexpected token', { line: 1, column: 5 });
      expect(error).toBeInstanceOf(ParseError);
    });
  });

  describe('properties', () => {
    it('has name set to "(EmbodyError) ParseError"', () => {
      const error = new ParseError('Unexpected token', { line: 1, column: 5 });
      expect(error.name).toBe('(EmbodyError) ParseError');
    });

    it('stores the provided message', () => {
      const error = new ParseError('Unexpected token: ;', { line: 3, column: 10 });
      expect(error.message).toBe('Unexpected token: ;');
    });

    it('stores the provided loc', () => {
      const error = new ParseError('Unexpected token', { line: 5, column: 12 });
      expect(error.loc).toEqual({ line: 5, column: 12 });
    });

    it('loc has readonly line and column', () => {
      const error = new ParseError('Unexpected token', { line: 1, column: 1 });
      expect(error.loc.line).toBe(1);
      expect(error.loc.column).toBe(1);
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided', () => {
      const cause = { snippet: 'const x =;', token: ';' };
      const error = new ParseError('Unexpected token', { line: 1, column: 10 }, { cause });
      expect(error.cause).toEqual(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new ParseError('Unexpected token', { line: 1, column: 1 });
      expect(error.cause).toBeUndefined();
    });
  });
});
