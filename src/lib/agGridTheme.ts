import { themeQuartz } from 'ag-grid-community';

/**
 * Enterprise AG Grid Theme configuration for FX ERP
 */
export const appTheme = themeQuartz.withParams({
  fontFamily: 'inherit',
  headerFontWeight: 600,
  headerFontSize: 12,
  fontSize: 12,
  rowHeight: 44,
  headerHeight: 40,
  headerBackgroundColor: '#f8fafc',
  borderColor: '#e2e8f0',
  oddRowBackgroundColor: '#ffffff',
  selectedRowBackgroundColor: '#eef2ff',
  rangeSelectionBackgroundColor: '#e0e7ff',
});

export default appTheme;
