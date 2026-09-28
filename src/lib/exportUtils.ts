/**
 * FX ERP - Export Utilities
 * Provides utilities for exporting tabular data and multi-section reports to CSV / Excel-compatible formats.
 */

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }

  let str = '';
  if (val instanceof Date) {
    str = val.toLocaleDateString('tr-TR');
  } else if (typeof val === 'object') {
    try {
      str = JSON.stringify(val);
    } catch {
      str = String(val);
    }
  } else {
    str = String(val);
  }

  // If cell contains semicolon, comma, newline, carriage return, or double quote, wrap in quotes and escape internal quotes
  if (
    str.includes(';') ||
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Downloads a flat array of objects as a CSV file.
 * Uses semicolon ';' delimiter and UTF-8 BOM for seamless Microsoft Excel & LibreOffice support in Turkish locale.
 */
export function downloadCsv(filename: string, data: Record<string, any>[]): void {
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.warn('downloadCsv called with empty or invalid data');
    return;
  }

  // Collect all unique keys from all objects to avoid missing columns
  const headerSet = new Set<string>();
  data.forEach((row) => {
    if (row && typeof row === 'object') {
      Object.keys(row).forEach((k) => headerSet.add(k));
    }
  });
  const headers = Array.from(headerSet);

  if (headers.length === 0) {
    return;
  }

  const csvRows: string[] = [];
  // Header row
  csvRows.push(headers.map(escapeCsvCell).join(';'));

  // Data rows
  for (const row of data) {
    const rowValues = headers.map((header) => escapeCsvCell(row?.[header]));
    csvRows.push(rowValues.join(';'));
  }

  triggerDownload(filename, csvRows.join('\r\n'));
}

export interface CsvSection {
  title?: string;
  rows: Record<string, any>[];
}

/**
 * Downloads a multi-section report as a single CSV file.
 */
export function downloadCsvSections(filename: string, sections: CsvSection[]): void {
  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    console.warn('downloadCsvSections called with empty or invalid sections');
    return;
  }

  const csvRows: string[] = [];

  sections.forEach((section, index) => {
    if (index > 0) {
      csvRows.push(''); // Blank line separator
    }

    if (section.title) {
      csvRows.push(escapeCsvCell(`=== ${section.title} ===`));
    }

    const rows = section.rows;
    if (rows && rows.length > 0) {
      const headerSet = new Set<string>();
      rows.forEach((row) => {
        if (row && typeof row === 'object') {
          Object.keys(row).forEach((k) => headerSet.add(k));
        }
      });
      const headers = Array.from(headerSet);

      if (headers.length > 0) {
        csvRows.push(headers.map(escapeCsvCell).join(';'));
        for (const row of rows) {
          const rowValues = headers.map((header) => escapeCsvCell(row?.[header]));
          csvRows.push(rowValues.join(';'));
        }
      }
    } else {
      csvRows.push(escapeCsvCell('(Kayıt bulunamadı)'));
    }
  });

  triggerDownload(filename, csvRows.join('\r\n'));
}

/**
 * Triggers browser download with UTF-8 BOM so Turkish characters display correctly in Excel.
 */
function triggerDownload(filename: string, content: string): void {
  const finalFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  const utf8Bom = '\uFEFF';
  const blob = new Blob([utf8Bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', finalFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

// Aliases for convenience
export const exportToCsv = downloadCsv;
export const exportToExcel = downloadCsv;
