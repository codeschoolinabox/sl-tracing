import EmbodyError from '../embody-error.js';
import InternalError from '../internal-error.js';

describe('InternalError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new InternalError('Unexpected error');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of EmbodyError', () => {
      const error = new InternalError('Unexpected error');
      expect(error).toBeInstanceOf(EmbodyError);
    });

    it('is an instance of InternalError', () => {
      const error = new InternalError('Unexpected error');
      expect(error).toBeInstanceOf(InternalError);
    });
  });

  describe('properties', () => {
    it('has name set to "(EmbodyError) InternalError"', () => {
      const error = new InternalError('Unexpected error');
      expect(error.name).toBe('(EmbodyError) InternalError');
    });

    it('stores the provided message', () => {
      const error = new InternalError('Unexpected error during tracing');
      expect(error.message).toBe('Unexpected error during tracing');
    });
  });

  describe('ES2022 cause support', () => {
    it('wraps the original error in cause', () => {
      const originalError = new Error('Something went wrong');
      const error = new InternalError('Unexpected error', { cause: originalError });
      expect(error.cause).toBe(originalError);
    });

    it('has undefined cause when not provided', () => {
      const error = new InternalError('Unexpected error');
      expect(error.cause).toBeUndefined();
    });
  });
});
