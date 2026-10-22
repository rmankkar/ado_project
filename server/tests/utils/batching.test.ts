import { describe, it, expect } from 'vitest';
import { chunkArray, deduplicateIds, validateAndParseIds } from '../../src/utils/batching.js';

describe('batching utilities', () => {
  describe('chunkArray', () => {
    it('splits array into chunks of specified size', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7];
      const chunks = chunkArray(arr, 3);
      expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
    });

    it('returns single chunk when array smaller than chunk size', () => {
      const arr = [1, 2];
      const chunks = chunkArray(arr, 5);
      expect(chunks).toEqual([[1, 2]]);
    });

    it('returns empty array for empty input', () => {
      expect(chunkArray([], 3)).toEqual([]);
    });

    it('throws for zero or negative chunk size', () => {
      expect(() => chunkArray([1, 2], 0)).toThrow('Chunk size must be positive');
      expect(() => chunkArray([1, 2], -1)).toThrow('Chunk size must be positive');
    });
  });

  describe('deduplicateIds', () => {
    it('removes duplicate IDs', () => {
      expect(deduplicateIds([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    });

    it('preserves order of first occurrence', () => {
      expect(deduplicateIds([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
    });

    it('handles empty array', () => {
      expect(deduplicateIds([])).toEqual([]);
    });
  });

  describe('validateAndParseIds', () => {
    it('parses valid comma-separated IDs', () => {
      const { ids, errors } = validateAndParseIds('123, 456, 789');
      expect(ids).toEqual([123, 456, 789]);
      expect(errors).toEqual([]);
    });

    it('trims whitespace', () => {
      const { ids } = validateAndParseIds(' 123 , 456 ');
      expect(ids).toEqual([123, 456]);
    });

    it('removes duplicates', () => {
      const { ids, errors } = validateAndParseIds('123, 123, 456');
      expect(ids).toEqual([123, 456]);
      // Duplicates are silently removed (no error added)
      expect(errors).toEqual([]);
    });

    it('rejects non-integer values', () => {
      const { ids, errors } = validateAndParseIds('123, abc, 456');
      expect(ids).toEqual([123, 456]);
      expect(errors).toContain('Invalid ID: "abc" (must be a positive integer)');
    });

    it('rejects zero and negative numbers', () => {
      const { ids, errors } = validateAndParseIds('123, 0, -5, 456');
      expect(ids).toEqual([123, 456]);
      expect(errors).toContain('Invalid ID: "0" (must be a positive integer)');
      expect(errors).toContain('Invalid ID: "-5" (must be a positive integer)');
    });

    it('rejects decimals', () => {
      const { ids, errors } = validateAndParseIds('123, 45.6, 789');
      expect(ids).toEqual([123, 789]);
      expect(errors).toContain('Invalid ID: "45.6" (must be a positive integer)');
    });

    it('handles empty input', () => {
      const { ids, errors } = validateAndParseIds('');
      expect(ids).toEqual([]);
      expect(errors).toEqual([]);
    });

    it('handles only whitespace', () => {
      const { ids, errors } = validateAndParseIds('   ');
      expect(ids).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
});