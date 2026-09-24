type ExportRow = Record<string, unknown>;

type ExportSection = {
  title: string;
  rows: ExportRow[];
};

const escapeCsvValue = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const rowsToCsv = (rows: ExportRow[]): string => {
  if (rows.length === 0) return '';

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  return [
    headers.map(escapeCsvValue).join(';'),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(';')),
  ].join('\r\n');
};

const downloadText = (filename: string, content: string): void => {
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const downloadCsv = (filename: string, rows: ExportRow[]): void => {
  downloadText(filename, rowsToCsv(rows));
};

export const downloadCsvSections = (filename: string, sections: ExportSection[]): void => {
  const content = sections
    .map(({ title, rows }) => `${title}\r\n${rowsToCsv(rows)}`)
    .join('\r\n\r\n');
  downloadText(filename, content);
};
