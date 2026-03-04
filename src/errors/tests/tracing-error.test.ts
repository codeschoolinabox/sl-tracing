import TracingError from '../tracing-error.js';

describe('TracingError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new TracingError('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of TracingError', () => {
      const error = new TracingError('test message');
      expect(error).toBeInstanceOf(TracingError);
    });
  });

  describe('properties', () => {
    it('has name set to "TracingError"', () => {
      const error = new TracingError('test message');
      expect(error.name).toBe('TracingError');
    });

    it('stores the provided message', () => {
      const error = new TracingError('my error message');
      expect(error.message).toBe('my error message');
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided', () => {
      const cause = new Error('original error');
      const error = new TracingError('wrapped error', { cause });
      expect(error.cause).toBe(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new TracingError('test message');
      expect(error.cause).toBeUndefined();
    });
  });
});
