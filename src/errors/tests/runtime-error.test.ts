import EmbodyError from '../embody-error.js';
import RuntimeError from '../runtime-error.js';

describe('RuntimeError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new RuntimeError('undefined is not a function');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of EmbodyError', () => {
      const error = new RuntimeError('undefined is not a function');
      expect(error).toBeInstanceOf(EmbodyError);
    });

    it('is an instance of RuntimeError', () => {
      const error = new RuntimeError('undefined is not a function');
      expect(error).toBeInstanceOf(RuntimeError);
    });
  });

  describe('properties', () => {
    it('has name set to "(EmbodyError) RuntimeError"', () => {
      const error = new RuntimeError('undefined is not a function');
      expect(error.name).toBe('(EmbodyError) RuntimeError');
    });

    it('stores the provided message', () => {
      const error = new RuntimeError('Cannot read property "x" of undefined');
      expect(error.message).toBe('Cannot read property "x" of undefined');
    });

    it('stores loc when provided', () => {
      const error = new RuntimeError('boom', { line: 5, column: 12 });
      expect(error.loc).toEqual({ line: 5, column: 12 });
    });

    it('has undefined loc when not provided', () => {
      const error = new RuntimeError('boom');
      expect(error.loc).toBeUndefined();
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided without loc', () => {
      const cause = { trace: ['fn1', 'fn2'] };
      const error = new RuntimeError('boom', undefined, { cause });
      expect(error.cause).toEqual(cause);
    });

    it('stores cause when provided with loc', () => {
      const cause = { variables: { x: 1 } };
      const error = new RuntimeError('boom', { line: 1, column: 1 }, { cause });
      expect(error.cause).toEqual(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new RuntimeError('boom');
      expect(error.cause).toBeUndefined();
    });
  });
});
