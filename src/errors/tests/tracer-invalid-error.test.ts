import EmbodyError from '../embody-error.js';
import TracerInvalidError from '../tracer-invalid-error.js';

describe('TracerInvalidError', () => {
  describe('construction', () => {
    it('extends EmbodyError', () => {
      const error = new TracerInvalidError(['some violation']);

      expect(error).toBeInstanceOf(EmbodyError);
    });

    it('sets name', () => {
      const error = new TracerInvalidError(['some violation']);

      expect(error.name).toBe('(EmbodyError) TracerInvalidError');
    });

    it('stores violations array', () => {
      const error = new TracerInvalidError([
        'id must be a non-empty string',
        'record must be a function',
      ]);

      expect(error.violations).toEqual([
        'id must be a non-empty string',
        'record must be a function',
      ]);
    });

    it('builds message from violations', () => {
      const error = new TracerInvalidError([
        'id must be a non-empty string',
        'record must be a function',
      ]);

      expect(error.message).toContain('id must be a non-empty string');
      expect(error.message).toContain('record must be a function');
    });
  });
});
