export const MAX_BATCH_SIZE = 200;

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) {
    throw new Error('Chunk size must be positive');
  }
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function deduplicateIds(ids: number[]): number[] {
  return [...new Set(ids)];
}

export function validateAndParseIds(input: string): { ids: number[]; errors: string[] } {
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

  return { ids: deduplicateIds(ids), errors };
}