import ArgumentInvalidError from '../argument-invalid-error.js';
import TracingError from '../tracing-error.js';

describe('ArgumentInvalidError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new ArgumentInvalidError('tracer', 'Expected string');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of TracingError', () => {
      const error = new ArgumentInvalidError('tracer', 'Expected string');
      expect(error).toBeInstanceOf(TracingError);
    });

    it('is an instance of ArgumentInvalidError', () => {
      const error = new ArgumentInvalidError('tracer', 'Expected string');
      expect(error).toBeInstanceOf(ArgumentInvalidError);
    });
  });

  describe('properties', () => {
    it('has name set to "(TracingError) ArgumentInvalidError"', () => {
      const error = new ArgumentInvalidError('tracer', 'Expected string');
      expect(error.name).toBe('(TracingError) ArgumentInvalidError');
    });

    it('stores the provided message', () => {
      const error = new ArgumentInvalidError('tracer', 'Expected tracer to be string, got number');
      expect(error.message).toBe('Expected tracer to be string, got number');
    });

    it('stores the field that was invalid', () => {
      const error = new ArgumentInvalidError('code', 'Expected code to be string');
      expect(error.field).toBe('code');
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided', () => {
      const cause = { provided: 123, expected: 'string' };
      const error = new ArgumentInvalidError('tracer', 'Expected string', { cause });
      expect(error.cause).toEqual(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new ArgumentInvalidError('tracer', 'Expected string');
      expect(error.cause).toBeUndefined();
    });
  });
});
