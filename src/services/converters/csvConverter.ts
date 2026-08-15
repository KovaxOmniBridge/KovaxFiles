import { convertSpreadsheetToCsv } from './spreadsheetConverter';

export { convertSpreadsheetToCsv as convertCsvToSpreadsheet };

export async function convertCsvToPdf(file: File) {
  const { convertSpreadsheetToPdf } = await import('./spreadsheetConverter');
  return convertSpreadsheetToPdf(file);
}

export async function convertCsvToDocx(file: File) {
  const { convertSpreadsheetToDocx } = await import('./spreadsheetConverter');
  return convertSpreadsheetToDocx(file);
}
