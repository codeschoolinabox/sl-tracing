import EmbodyError from '../embody-error.js';
import OptionsSemanticInvalidError from '../options-semantic-invalid-error.js';

describe('OptionsSemanticInvalidError', () => {
  describe('inheritance', () => {
    it('is an instance of Error', () => {
      const error = new OptionsSemanticInvalidError('constraint violated');
      expect(error).toBeInstanceOf(Error);
    });

    it('is an instance of EmbodyError', () => {
      const error = new OptionsSemanticInvalidError('constraint violated');
      expect(error).toBeInstanceOf(EmbodyError);
    });

    it('is an instance of OptionsSemanticInvalidError', () => {
      const error = new OptionsSemanticInvalidError('constraint violated');
      expect(error).toBeInstanceOf(OptionsSemanticInvalidError);
    });
  });

  describe('properties', () => {
    it('has name set to "(EmbodyError) OptionsSemanticInvalidError"', () => {
      const error = new OptionsSemanticInvalidError('constraint violated');
      expect(error.name).toBe('(EmbodyError) OptionsSemanticInvalidError');
    });

    it('stores the provided message', () => {
      const error = new OptionsSemanticInvalidError('strict and lenient are mutually exclusive');
      expect(error.message).toBe('strict and lenient are mutually exclusive');
    });
  });

  describe('ES2022 cause support', () => {
    it('stores cause when provided', () => {
      const cause = { conflictingFields: ['strict', 'lenient'] };
      const error = new OptionsSemanticInvalidError('mutually exclusive', { cause });
      expect(error.cause).toEqual(cause);
    });

    it('has undefined cause when not provided', () => {
      const error = new OptionsSemanticInvalidError('constraint violated');
      expect(error.cause).toBeUndefined();
    });
  });
});
