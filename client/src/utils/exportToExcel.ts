import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  render?: (value: any, row: any) => string;
}

interface ExportOptions {
  filename: string;
  sheetName: string;
  columns: ExportColumn[];
  data: any[];
}

/**
 * Export data to Excel file
 */
export function exportToExcel(options: ExportOptions): void {
  const { filename, sheetName, columns, data } = options;

  // Prepare worksheet data
  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key];
      return col.render ? col.render(value, row) : (value ?? '');
    })
  );

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  const colWidths = columns.map(col => ({ wch: col.width || 20 }));
  ws['!cols'] = colWidths;

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Write file
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Format date for Excel export
 */
export function formatDateForExport(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Format date time for Excel export
 */
export function formatDateTimeForExport(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

/**
 * Sanitize text for Excel (remove HTML tags, etc.)
 */
export function sanitizeForExcel(text: string | null | undefined): string {
  if (!text) return '';
  // Remove HTML tags
  return text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}