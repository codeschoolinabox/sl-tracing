import TracingError from '../tracing-error.js';
import StepsInvalidError from '../steps-invalid-error.js';

describe('StepsInvalidError', () => {
  describe('construction', () => {
    it('extends TracingError', () => {
      const error = new StepsInvalidError(['some violation']);

      expect(error).toBeInstanceOf(TracingError);
    });

    it('sets name', () => {
      const error = new StepsInvalidError(['some violation']);

      expect(error.name).toBe('(TracingError) StepsInvalidError');
    });

    it('stores violations array', () => {
      const error = new StepsInvalidError([
        'steps[0].step: expected 1 (1-indexed), got 0',
        'steps[1].loc.start: expected object with line and column',
      ]);

      expect(error.violations).toEqual([
        'steps[0].step: expected 1 (1-indexed), got 0',
        'steps[1].loc.start: expected object with line and column',
      ]);
    });

    it('builds message from violations', () => {
      const error = new StepsInvalidError([
        'steps[0].step: expected 1 (1-indexed), got 0',
        'steps[1].loc.start: expected object with line and column',
      ]);

      expect(error.message).toContain(
        'steps[0].step: expected 1 (1-indexed), got 0',
      );
      expect(error.message).toContain(
        'steps[1].loc.start: expected object with line and column',
      );
    });

    it('supports ErrorOptions for cause chaining', () => {
      const cause = new Error('underlying issue');
      const error = new StepsInvalidError(['some violation'], { cause });

      expect(error.cause).toBe(cause);
    });
  });
});
