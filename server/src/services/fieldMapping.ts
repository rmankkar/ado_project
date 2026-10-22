import { fieldMappings } from '../config/env.js';

export interface FieldMappingConfig {
  boardColumn: string;
  deployDate: string;
  targetDate: string;
}

export function getFieldMappings(): FieldMappingConfig {
  return {
    boardColumn: fieldMappings.boardColumn,
    deployDate: fieldMappings.deployDate,
    targetDate: fieldMappings.targetDate,
  };
}

export function validateFieldMappings(availableFields: Set<string>): { valid: string[]; missing: string[] } {
  const mappings = getFieldMappings();
  const valid: string[] = [];
  const missing: string[] = [];

  for (const [key, value] of Object.entries(mappings)) {
    if (availableFields.has(value)) {
      valid.push(`${key}: ${value}`);
    } else {
      missing.push(`${key}: ${value}`);
    }
  }

  return { valid, missing };
}

export function getFieldValue<T>(fields: Record<string, unknown>, fieldRef: string): T | null {
  const value = fields[fieldRef];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return value as T;
}