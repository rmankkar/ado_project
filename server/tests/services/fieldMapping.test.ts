import { describe, it, expect, vi } from 'vitest';
import { getFieldMappings, validateFieldMappings, getFieldValue } from '../../src/services/fieldMapping.js';

describe('fieldMapping service', () => {
  describe('getFieldMappings', () => {
    it('returns configured field mappings', () => {
      const mappings = getFieldMappings();
      expect(mappings).toHaveProperty('boardColumn');
      expect(mappings).toHaveProperty('deployDate');
      expect(mappings).toHaveProperty('targetDate');
    });
  });

  describe('validateFieldMappings', () => {
    it('identifies valid and missing fields', () => {
      const availableFields = new Set([
        'System.Id',
        'System.Title',
        'System.BoardColumn',
        'Custom.DeployDate',
        'Microsoft.VSTS.Scheduling.TargetDate',
      ]);

      const { valid, missing } = validateFieldMappings(availableFields);

      expect(valid).toContain('boardColumn: System.BoardColumn');
      expect(valid).toContain('deployDate: Custom.DeployDate');
      expect(valid).toContain('targetDate: Microsoft.VSTS.Scheduling.TargetDate');
      expect(missing).toHaveLength(0);
    });

    it('identifies missing fields', () => {
      const availableFields = new Set(['System.Id', 'System.Title']);

      const { valid, missing } = validateFieldMappings(availableFields);

      expect(valid).toHaveLength(0);
      expect(missing).toHaveLength(3);
    });
  });

  describe('getFieldValue', () => {
    it('returns value when field exists and has value', () => {
      const fields = { 'Custom.DeployDate': '2024-03-15' };
      const value = getFieldValue<string>(fields, 'Custom.DeployDate');
      expect(value).toBe('2024-03-15');
    });

    it('returns null when field is missing', () => {
      const fields = { 'System.Title': 'Test' };
      const value = getFieldValue<string>(fields, 'Custom.DeployDate');
      expect(value).toBeNull();
    });

    it('returns null when field value is empty string', () => {
      const fields = { 'Custom.DeployDate': '' };
      const value = getFieldValue<string>(fields, 'Custom.DeployDate');
      expect(value).toBeNull();
    });

    it('returns null when field value is undefined', () => {
      const fields = { 'Custom.DeployDate': undefined };
      const value = getFieldValue<string>(fields, 'Custom.DeployDate');
      expect(value).toBeNull();
    });

    it('returns null when field value is null', () => {
      const fields = { 'Custom.DeployDate': null };
      const value = getFieldValue<string>(fields, 'Custom.DeployDate');
      expect(value).toBeNull();
    });
  });
});