import StepsInvalidError from '../../errors/steps-invalid-error.js';
import validateSteps from '../validate-steps.js';

describe('validateSteps', () => {
  describe('happy path', () => {
    it('valid steps array passes', () => {
      const steps = [
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } },
        { step: 2, loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 3 } } },
      ];

      expect(() => validateSteps(steps)).not.toThrow();
    });

    it('empty array passes', () => {
      expect(() => validateSteps([])).not.toThrow();
    });

    it('steps with extra tracer-specific fields pass', () => {
      const steps = [
        {
          step: 1,
          loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } },
          char: 'a',
          customField: 42,
        },
      ];

      expect(() => validateSteps(steps)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('single-step array passes', () => {
      const steps = [
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).not.toThrow();
    });

    it('steps with column 0 pass', () => {
      const steps = [
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } } },
      ];

      expect(() => validateSteps(steps)).not.toThrow();
    });
  });

  describe('errors — non-array', () => {
    it('undefined → throws StepsInvalidError', () => {
      expect(() => validateSteps()).toThrow(StepsInvalidError);
    });

    it('null → throws StepsInvalidError', () => {
      expect(() => validateSteps(null)).toThrow(StepsInvalidError);
    });

    it('string → throws StepsInvalidError', () => {
      expect(() => validateSteps('not an array')).toThrow(StepsInvalidError);
    });

    it('number → throws StepsInvalidError', () => {
      expect(() => validateSteps(42)).toThrow(StepsInvalidError);
    });

    it('plain object → throws StepsInvalidError', () => {
      expect(() => validateSteps({ step: 1 })).toThrow(StepsInvalidError);
    });
  });

  describe('errors — non-POJO elements', () => {
    it('array containing null → violation', () => {
      expect(() => validateSteps([null])).toThrow(StepsInvalidError);
    });

    it('array containing primitive → violation', () => {
      expect(() => validateSteps([42])).toThrow(StepsInvalidError);
    });

    it('array containing class instance → violation', () => {
      expect(() => validateSteps([new Date()])).toThrow(StepsInvalidError);
    });
  });

  describe('errors — invalid step field', () => {
    it('missing step field → violation', () => {
      const steps = [
        { loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('expected number');
    });

    it('non-number step field → violation', () => {
      const steps = [
        { step: '1', loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('expected number');
    });

    it('0-indexed step field → violation', () => {
      const steps = [
        { step: 0, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('expected 1 (1-indexed)');
    });

    it('non-sequential step field → violation', () => {
      const steps = [
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
        { step: 5, loc: { start: { line: 2, column: 0 }, end: { line: 2, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('expected 2 (1-indexed)');
    });
  });

  describe('errors — invalid loc field', () => {
    it('missing loc field → violation', () => {
      const steps = [{ step: 1 }];

      expect(() => validateSteps(steps)).toThrow('expected object with start and end');
    });

    it('non-object loc → violation', () => {
      const steps = [{ step: 1, loc: 'not an object' }];

      expect(() => validateSteps(steps)).toThrow('expected object with start and end');
    });

    it('missing start → violation', () => {
      const steps = [
        { step: 1, loc: { end: { line: 1, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('loc.start');
    });

    it('start.line < 1 → violation', () => {
      const steps = [
        { step: 1, loc: { start: { line: 0, column: 0 }, end: { line: 1, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('start.line: expected number >= 1');
    });

    it('start.column < 0 → violation', () => {
      const steps = [
        { step: 1, loc: { start: { line: 1, column: -1 }, end: { line: 1, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('start.column: expected number >= 0');
    });

    it('end.line < 1 → violation', () => {
      const steps = [
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 0, column: 1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('end.line: expected number >= 1');
    });

    it('end.column < 0 → violation', () => {
      const steps = [
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: -1 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('end.column: expected number >= 0');
    });

    it('non-number line/column → violation', () => {
      const steps = [
        { step: 1, loc: { start: { line: '1', column: '0' }, end: { line: 1, column: 0 } } },
      ];

      expect(() => validateSteps(steps)).toThrow('start.line');
    });
  });

  describe('errors — aggregate', () => {
    it('multiple violations collected in single throw', () => {
      const steps = [
        { step: 0, loc: { start: { line: 0, column: -1 }, end: { line: 0, column: -1 } } },
      ];

      try {
        validateSteps(steps);
      } catch (error) {
        expect(error).toBeInstanceOf(StepsInvalidError);
        expect((error as StepsInvalidError).violations.length).toBeGreaterThan(1);
      }
    });

    it('mix of step and loc violations in same array', () => {
      const steps = [
        { step: 0, loc: 'bad' },
        { step: 1, loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } } },
      ];

      try {
        validateSteps(steps);
      } catch (error) {
        expect(error).toBeInstanceOf(StepsInvalidError);
        const { violations } = error as StepsInvalidError;
        const hasStepViolation = violations.some((v) => v.includes('step'));
        const hasLocViolation = violations.some((v) => v.includes('loc'));
        expect(hasStepViolation).toBe(true);
        expect(hasLocViolation).toBe(true);
      }
    });
  });
});
