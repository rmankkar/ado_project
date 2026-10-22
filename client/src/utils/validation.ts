export function parseFeatureIds(input: string): { ids: number[]; errors: string[] } {
  const errors: string[] = [];
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);

  const ids = parts.map(part => {
    const num = Number(part);
    if (!Number.isInteger(num) || num <= 0) {
      errors.push(`Invalid ID: "${part}" (must be a positive integer)`);
      return null;
    }
    return num;
  }).filter((id): id is number => id !== null);

  // Deduplicate
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length !== ids.length) {
    errors.push(`Removed ${ids.length - uniqueIds.length} duplicate ID(s)`);
  }

  return { ids: uniqueIds, errors };
}

export function validateFeatureIds(ids: number[]): string[] {
  const errors: string[] = [];
  if (ids.length === 0) {
    errors.push('At least one Feature ID is required');
  }
  if (ids.length > 500) {
    errors.push('Too many IDs (maximum 500)');
  }
  return errors;
}