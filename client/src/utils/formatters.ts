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

/**
 * Check if a date string represents a date in the past (before today)
 * Optionally exclude certain statuses (e.g., "Completed", "Closed") from showing as past due
 */
export function isDateInPast(dateString: string | null, status?: string | null): boolean {
  if (!dateString) return false;

  // Don't highlight as past due if status is Completed or Closed
  if (status) {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'completed' || normalizedStatus === 'closed') {
      return false;
    }
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;
    // Compare only the date part (ignore time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  } catch {
    return false;
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

/**
 * Calculate the number of days since a given date string until now
 * Returns null if the date string is invalid or null
 */
export function getDaysSince(dateString: string | null): number | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    // Compare only the date part (ignore time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - compareDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

/**
 * Get the age label for a bug based on days since creation
 * Returns an object with the label text and CSS class, or null if <= 7 days
 */
export function getBugAgeLabel(dateString: string | null): { text: string; className: string } | null {
  const daysSince = getDaysSince(dateString);
  if (daysSince === null || daysSince <= 4) return null;

  if (daysSince > 12) {
    return { text: `${daysSince} days`, className: 'bg-red-100 text-red-700' };
  }
  // 8-12 days
  return { text: `${daysSince} days`, className: 'bg-yellow-100 text-yellow-700' };
}

/**
 * Strip HTML tags and decode HTML entities from a string
 * Returns plain text safe for display
 */
export function stripHtml(html: string | null): string {
  if (!html) return '';

  // Create a temporary DOM element to parse HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');
  let text = doc.body.textContent || '';

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®');

  // Normalize whitespace
  return text.replace(/\s+/g, ' ').trim();
}