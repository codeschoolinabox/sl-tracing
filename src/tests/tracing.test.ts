import txtCharsTracer from '../api/tests/txt-chars/index.js';
import TracerInvalidError from '../errors/tracer-invalid-error.js';
import tracing from '../tracing.js';

// ---------------------------------------------------------------------------
// tracing()
// ---------------------------------------------------------------------------

describe('tracing', () => {
  describe('return shape', () => {
    it('returns an object with trace, tracify, embody, embodify', () => {
      const api = tracing(txtCharsTracer);

      expect(typeof api.trace).toBe('function');
    });

    it('returns object with tracify closure', () => {
      const api = tracing(txtCharsTracer);

      expect(typeof api.tracify).toBe('function');
    });

    it('returns object with embody chain', () => {
      const api = tracing(txtCharsTracer);

      expect(typeof api.embody.code).toBe('function');
    });

    it('returns object with embodify chain', () => {
      const api = tracing(txtCharsTracer);

      expect(typeof api.embodify.set).toBe('function');
    });

    it('returns a frozen object', () => {
      const api = tracing(txtCharsTracer);

      expect(Object.isFrozen(api)).toBe(true);
    });
  });

  describe('pre-bound trace', () => {
    it('traces code without passing tracer again', async () => {
      const { trace } = tracing(txtCharsTracer);
      const steps = await trace('ab');

      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('pre-bound embody', () => {
    it('traces code via .code().steps without passing tracer again', async () => {
      const { embody } = tracing(txtCharsTracer);
      const steps = await embody.code('ab').steps;

      expect(steps.length).toBeGreaterThan(0);
    });
  });

  describe('invalid tracer', () => {
    it('throws TracerInvalidError immediately for null', () => {
      expect(() => tracing(null as never)).toThrow(TracerInvalidError);
    });

    it('throws TracerInvalidError immediately for string tracer id', () => {
      expect(() => tracing('txt:chars' as never)).toThrow(TracerInvalidError);
    });

    it('throws before returning any wrappers', () => {
      expect(() => tracing({} as never)).toThrow(TracerInvalidError);
    });
  });
});
