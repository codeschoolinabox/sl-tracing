import EmbodyError from '../embody-error.js';
import OptionsInvalidError from '../options-invalid-error.js';

describe('OptionsInvalidError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new OptionsInvalidError('direction must be string');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of EmbodyError', () => {
      const error = new OptionsInvalidError('direction must be string');
      expect(error).toBeInstanceOf(EmbodyError);
    });

    it('is an instance of OptionsInvalidError', () => {
      const error = new OptionsInvalidError('direction must be string');
      expect(error).toBeInstanceOf(OptionsInvalidError);
    });
  });

  describe('properties', () => {
    it('has name set to "(EmbodyError) OptionsInvalidError"', () => {
      const error = new OptionsInvalidError('direction must be string');
      expect(error.name).toBe('(EmbodyError) OptionsInvalidError');
    });

    it('stores the provided message', () => {
      const error = new OptionsInvalidError('direction must be one of: lr, rl');
      expect(error.message).toBe('direction must be one of: lr, rl');
    });

    it('stores path when provided', () => {
      const error = new OptionsInvalidError('must be string', 'options.direction');
      expect(error.path).toBe('options.direction');
    });

    it('has undefined path when not provided', () => {
      const error = new OptionsInvalidError('must be string');
      expect(error.path).toBeUndefined();
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided without path', () => {
      const cause = { allowedValues: ['lr', 'rl'] };
      const error = new OptionsInvalidError('must be string', undefined, { cause });
      expect(error.cause).toEqual(cause);
    });

    it('stores cause when provided with path', () => {
      const cause = { schema: { type: 'string' } };
      const error = new OptionsInvalidError('must be string', 'options.x', { cause });
      expect(error.cause).toEqual(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new OptionsInvalidError('must be string');
      expect(error.cause).toBeUndefined();
    });
  });
});
