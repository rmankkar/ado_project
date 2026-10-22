export function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function getStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes('new') || normalized.includes('proposed')) return 'badge-new';
  if (normalized.includes('active') || normalized.includes('in progress') || normalized.includes('doing')) return 'badge-active';
  if (normalized.includes('failed')) return 'badge-failed';
  if (normalized.includes('resolved') || normalized.includes('done') || normalized.includes('complete') || normalized.includes('ready for retest')) return 'badge-resolved';
  if (normalized.includes('closed') || normalized.includes('removed')) return 'badge-closed';
  return 'badge';
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}