import { describe, it, expect } from 'vitest';
import { parseFeatureIds, validateFeatureIds } from '../../src/utils/validation.js';

describe('validation utilities', () => {
  describe('parseFeatureIds', () => {
    it('parses valid comma-separated IDs', () => {
      const { ids, errors } = parseFeatureIds('123, 456, 789');
      expect(ids).toEqual([123, 456, 789]);
      expect(errors).toEqual([]);
    });

    it('trims whitespace', () => {
      const { ids } = parseFeatureIds(' 123 , 456 ');
      expect(ids).toEqual([123, 456]);
    });

    it('removes duplicates', () => {
      const { ids, errors } = parseFeatureIds('123, 123, 456');
      expect(ids).toEqual([123, 456]);
      expect(errors).toContain('Removed 1 duplicate ID(s)');
    });

    it('rejects non-integer values', () => {
      const { ids, errors } = parseFeatureIds('123, abc, 456');
      expect(ids).toEqual([123, 456]);
      expect(errors).toContain('Invalid ID: "abc" (must be a positive integer)');
    });

    it('rejects zero and negative numbers', () => {
      const { ids, errors } = parseFeatureIds('123, 0, -5, 456');
      expect(ids).toEqual([123, 456]);
      expect(errors).toContain('Invalid ID: "0" (must be a positive integer)');
      expect(errors).toContain('Invalid ID: "-5" (must be a positive integer)');
    });

    it('handles empty input', () => {
      const { ids, errors } = parseFeatureIds('');
      expect(ids).toEqual([]);
      expect(errors).toEqual([]);
    });
  });

  describe('validateFeatureIds', () => {
    it('passes for valid IDs', () => {
      expect(validateFeatureIds([123, 456])).toEqual([]);
    });

    it('fails for empty array', () => {
      expect(validateFeatureIds([])).toEqual(['At least one Feature ID is required']);
    });

    it('fails for too many IDs', () => {
      const ids = Array.from({ length: 501 }, (_, i) => i + 1);
      expect(validateFeatureIds(ids)).toEqual(['Too many IDs (maximum 500)']);
    });
  });
});