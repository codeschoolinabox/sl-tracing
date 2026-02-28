import TracerInvalidError from '../../errors/tracer-invalid-error.js';
import validateTracerModule from '../validate-tracer-module.js';

const validModule = {
  id: 'test:tracer',
  langs: Object.freeze(['txt']),
  record: () => Promise.resolve([]),
};

describe('validateTracerModule', () => {
  describe('valid modules', () => {
    it('passes for minimal valid module (id, langs, record)', () => {
      expect(() => validateTracerModule(validModule)).not.toThrow();
    });

    it('passes with empty langs (universal tracer)', () => {
      expect(() => validateTracerModule({ ...validModule, langs: [] })).not.toThrow();
    });

    it('passes with optional optionsSchema', () => {
      expect(() =>
        validateTracerModule({ ...validModule, optionsSchema: { type: 'object' } }),
      ).not.toThrow();
    });

    it('passes with optional verifyOptions', () => {
      expect(() => validateTracerModule({ ...validModule, verifyOptions: () => {} })).not.toThrow();
    });
  });

  describe('not an object', () => {
    it('throws TracerInvalidError for null', () => {
      expect(() => validateTracerModule(null)).toThrow(TracerInvalidError);
    });

    it('throws TracerInvalidError for a string', () => {
      expect(() => validateTracerModule('txt:chars')).toThrow(TracerInvalidError);
    });

    it('throws TracerInvalidError for an array', () => {
      expect(() => validateTracerModule([])).toThrow(TracerInvalidError);
    });
  });

  describe('id field', () => {
    it('throws for missing id', () => {
      const { id: _id, ...noId } = validModule;

      expect(() => validateTracerModule(noId)).toThrow(/id/);
    });

    it('throws for empty string id', () => {
      expect(() => validateTracerModule({ ...validModule, id: '' })).toThrow(/id/);
    });

    it('throws for non-string id', () => {
      expect(() => validateTracerModule({ ...validModule, id: 42 })).toThrow(/id/);
    });
  });

  describe('langs field', () => {
    it('throws for missing langs', () => {
      const { langs: _langs, ...noLangs } = validModule;

      expect(() => validateTracerModule(noLangs)).toThrow(/langs/);
    });

    it('throws for non-array langs', () => {
      expect(() => validateTracerModule({ ...validModule, langs: 'txt' })).toThrow(/langs/);
    });

    it('throws for array containing non-strings', () => {
      expect(() => validateTracerModule({ ...validModule, langs: [42] })).toThrow(/langs/);
    });
  });

  describe('record field', () => {
    it('throws for missing record', () => {
      const { record: _record, ...noRecord } = validModule;

      expect(() => validateTracerModule(noRecord)).toThrow(/record/);
    });

    it('throws for non-function record', () => {
      expect(() => validateTracerModule({ ...validModule, record: 'not a function' })).toThrow(
        /record/,
      );
    });
  });

  describe('optionsSchema field (optional)', () => {
    it('throws for non-object optionsSchema', () => {
      expect(() =>
        validateTracerModule({ ...validModule, optionsSchema: 'not an object' }),
      ).toThrow(/optionsSchema/);
    });

    it('throws for array optionsSchema', () => {
      expect(() => validateTracerModule({ ...validModule, optionsSchema: [] })).toThrow(
        /optionsSchema/,
      );
    });
  });

  describe('verifyOptions field (optional)', () => {
    it('throws for non-function verifyOptions', () => {
      expect(() =>
        validateTracerModule({ ...validModule, verifyOptions: 'not a function' }),
      ).toThrow(/verifyOptions/);
    });
  });

  describe('aggregate violations', () => {
    it('collects multiple violations before throwing', () => {
      try {
        validateTracerModule({ langs: 'bad', record: 'bad' });
      } catch (error) {
        expect(error).toBeInstanceOf(TracerInvalidError);
        expect((error as TracerInvalidError).violations.length).toBeGreaterThan(1);
      }
    });
  });
});
