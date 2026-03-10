// File: frontend/src/dashboard/utils/exportData.ts
// Purpose: Provides dashboard utility functions for export data.
// It supports repeated admin-side formatting, query, or state logic.

/**
 * Data Export Utilities
 * Provides functionality to export data to various formats (CSV, JSON, Excel-ready)
 */

export interface ExportOptions {
  filename?: string;
  columns?: string[];
  format?: 'csv' | 'json' | 'tsv';
}

type ExportRow = Record<string, unknown>;

/**
 * Convert array of objects to CSV string
 */
export function convertToCSV(data: ExportRow[], columns?: string[]): string {
  if (data.length === 0) return '';

  // Get column headers
  const headers = columns || Object.keys(data[0]);

  // Create CSV header row
  const csvHeaders = headers.map((h) => `"${h}"`).join(',');

  // Create CSV data rows
  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value)}"`;
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      })
      .join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

/**
 * Convert array of objects to TSV string (Tab-Separated Values)
 */
export function convertToTSV(data: ExportRow[], columns?: string[]): string {
  if (data.length === 0) return '';

  const headers = columns || Object.keys(data[0]);
  const tsvHeaders = headers.join('\t');

  const tsvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
        return stringValue;
      })
      .join('\t');
  });

  return [tsvHeaders, ...tsvRows].join('\n');
}

/**
 * Download data as file (CSV, JSON, TSV)
 */
export function downloadData(
  data: ExportRow[],
  options: ExportOptions = {}
): void {
  const { filename = 'export', columns, format = 'csv' } = options;

  let content = '';
  let mimeType = '';
  let fileExtension = '';

  switch (format) {
    case 'csv':
      content = convertToCSV(data, columns);
      mimeType = 'text/csv;charset=utf-8;';
      fileExtension = 'csv';
      break;
    case 'json':
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json;charset=utf-8;';
      fileExtension = 'json';
      break;
    case 'tsv':
      content = convertToTSV(data, columns);
      mimeType = 'text/tab-separated-values;charset=utf-8;';
      fileExtension = 'tsv';
      break;
    default:
      throw new Error(`Unsupported format: ${format}`);
  }

  const link = document.createElement('a');
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.${fileExtension}`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export array of objects to CSV file with formatting
 */
export function exportToCSV(
  data: ExportRow[],
  filename?: string,
  columns?: string[]
): void {
  downloadData(data, {
    filename: filename || 'export',
    columns,
    format: 'csv',
  });
}

/**
 * Export array of objects to JSON file
 */
export function exportToJSON(
  data: ExportRow[],
  filename?: string,
  columns?: string[]
): void {
  downloadData(data, {
    filename: filename || 'export',
    columns,
    format: 'json',
  });
}

/**
 * Export array of objects to TSV file (Excel-compatible)
 */
export function exportToTSV(
  data: ExportRow[],
  filename?: string,
  columns?: string[]
): void {
  downloadData(data, {
    filename: filename || 'export',
    columns,
    format: 'tsv',
  });
}

/**
 * Generate a formatted filename with timestamp
 */
export function generateFilename(baseeName: string, includeTimestamp: boolean = true): string {
  if (!includeTimestamp) return baseeName;

  const timestamp = new Date().toISOString().split('T')[0];
  return `${baseeName}-${timestamp}`;
}

/**
 * Parse CSV string to array of objects
 */
export function parseCSV(csvString: string): ExportRow[] {
  const lines = csvString.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, ''));

  // Parse rows
  const rows: ExportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.replace(/^"|"$/g, ''));
    const row: ExportRow = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
}

/**
 * Create a summary report of data
 */
export function generateReport(data: ExportRow[]): string {
  const timestamp = new Date().toLocaleString();
  const totalRecords = data.length;
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  let report = '';
  report += `Export Report\n`;
  report += `Generated: ${timestamp}\n`;
  report += `Total Records: ${totalRecords}\n`;
  report += `Columns: ${columns.length}\n`;
  report += `Column Names: ${columns.join(', ')}\n`;

  return report;
}

