import EmbodyError from '../embody-error.js';
import LimitExceededError from '../limit-exceeded-error.js';

describe('LimitExceededError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new LimitExceededError('Exceeded maximum steps', 'steps', 1001);
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of EmbodyError', () => {
      const error = new LimitExceededError('Exceeded maximum steps', 'steps', 1001);
      expect(error).toBeInstanceOf(EmbodyError);
    });

    it('is an instance of LimitExceededError', () => {
      const error = new LimitExceededError('Exceeded maximum steps', 'steps', 1001);
      expect(error).toBeInstanceOf(LimitExceededError);
    });
  });

  describe('properties', () => {
    it('has name set to "(EmbodyError) LimitExceededError"', () => {
      const error = new LimitExceededError('Exceeded limit', 'steps', 1001);
      expect(error.name).toBe('(EmbodyError) LimitExceededError');
    });

    it('stores the provided message', () => {
      const error = new LimitExceededError('Exceeded maximum steps (1000)', 'steps', 1001);
      expect(error.message).toBe('Exceeded maximum steps (1000)');
    });

    it('stores the limit type', () => {
      const error = new LimitExceededError('Exceeded limit', 'time', 5001);
      expect(error.limit).toBe('time');
    });

    it('stores the actual value', () => {
      const error = new LimitExceededError('Exceeded limit', 'iterations', 10_001);
      expect(error.actual).toBe(10_001);
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided', () => {
      const cause = { maxAllowed: 1000 };
      const error = new LimitExceededError('Exceeded limit', 'steps', 1001, { cause });
      expect(error.cause).toEqual(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new LimitExceededError('Exceeded limit', 'steps', 1001);
      expect(error.cause).toBeUndefined();
    });
  });
});
