import EmbodyError from '../embody-error.js';

describe('EmbodyError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new EmbodyError('test message');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of EmbodyError', () => {
      const error = new EmbodyError('test message');
      expect(error).toBeInstanceOf(EmbodyError);
    });
  });

  describe('properties', () => {
    it('has name set to "EmbodyError"', () => {
      const error = new EmbodyError('test message');
      expect(error.name).toBe('EmbodyError');
    });

    it('stores the provided message', () => {
      const error = new EmbodyError('my error message');
      expect(error.message).toBe('my error message');
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided', () => {
      const cause = new Error('original error');
      const error = new EmbodyError('wrapped error', { cause });
      expect(error.cause).toBe(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new EmbodyError('test message');
      expect(error.cause).toBeUndefined();
    });
  });
});
