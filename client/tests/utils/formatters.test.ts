import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime, getStatusBadgeClass, truncate } from '../../src/utils/formatters.js';

describe('formatters utilities', () => {
  describe('formatDate', () => {
    it('formats valid ISO date string', () => {
      expect(formatDate('2024-03-15')).toBe('Mar 15, 2024');
    });

    it('formats valid ISO datetime string', () => {
      expect(formatDate('2024-03-15T10:30:00Z')).toBe('Mar 15, 2024');
    });

    it('returns em dash for null', () => {
      expect(formatDate(null)).toBe('—');
    });

    it('returns em dash for empty string', () => {
      expect(formatDate('')).toBe('—');
    });

    it('returns em dash for invalid date', () => {
      expect(formatDate('invalid')).toBe('—');
    });
  });

  describe('formatDateTime', () => {
    it('formats valid ISO datetime string', () => {
      const result = formatDateTime('2024-03-15T10:30:00Z');
      expect(result).toContain('2024');
      expect(result).toContain('Mar');
      expect(result).toContain('15');
    });

    it('returns em dash for null', () => {
      expect(formatDateTime(null)).toBe('—');
    });
  });

  describe('getStatusBadgeClass', () => {
    it('returns badge-new for new-like statuses', () => {
      expect(getStatusBadgeClass('New')).toBe('badge-new');
      expect(getStatusBadgeClass('Proposed')).toBe('badge-new');
      expect(getStatusBadgeClass('new')).toBe('badge-new');
    });

    it('returns badge-active for active-like statuses', () => {
      expect(getStatusBadgeClass('Active')).toBe('badge-active');
      expect(getStatusBadgeClass('In Progress')).toBe('badge-active');
      expect(getStatusBadgeClass('Doing')).toBe('badge-active');
    });

    it('returns badge-resolved for resolved-like statuses', () => {
      expect(getStatusBadgeClass('Resolved')).toBe('badge-resolved');
      expect(getStatusBadgeClass('Done')).toBe('badge-resolved');
      expect(getStatusBadgeClass('Complete')).toBe('badge-resolved');
    });

    it('returns badge-closed for closed-like statuses', () => {
      expect(getStatusBadgeClass('Closed')).toBe('badge-closed');
      expect(getStatusBadgeClass('Removed')).toBe('badge-closed');
    });

    it('returns base badge for unknown statuses', () => {
      expect(getStatusBadgeClass('Custom Status')).toBe('badge');
    });
  });

  describe('truncate', () => {
    it('returns original string when shorter than max', () => {
      expect(truncate('Hello', 10)).toBe('Hello');
    });

    it('truncates and adds ellipsis when longer', () => {
      expect(truncate('Hello World', 8)).toBe('Hello W…');
    });

    it('handles exact length', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });
  });
});