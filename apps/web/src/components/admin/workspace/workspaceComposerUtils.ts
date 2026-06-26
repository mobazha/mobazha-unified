/** Heuristic: pasted content likely product catalog data (CSV / table rows). */
export function looksLikeProductImport(text: string): boolean {
  const material = text.trim();
  if (material.length < 24) return false;

  const lines = material.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length >= 2) {
    const commaLines = lines.filter(line => (line.match(/,/g) ?? []).length >= 2);
    if (commaLines.length >= 2) return true;
    const tabLines = lines.filter(line => line.includes('\t'));
    if (tabLines.length >= 2) return true;
  }

  const header = lines[0]?.toLowerCase() ?? '';
  if (
    /^(title|name|product|sku|price|item)/.test(header) &&
    (header.includes(',') || header.includes('\t'))
  ) {
    return true;
  }

  if (lines.length === 1 && (material.match(/,/g) ?? []).length >= 4) {
    return true;
  }

  return false;
}

/** File types accepted by product-import ingest (aligned with node ingest handler). */
export const PRODUCT_IMPORT_FILE_ACCEPT =
  '.csv,.xlsx,.zip,.txt,.md,.json,.pdf,.jpg,.jpeg,.png,.webp';

const PRODUCT_IMPORT_EXTENSIONS = new Set(
  PRODUCT_IMPORT_FILE_ACCEPT.split(',').map(ext => ext.trim().toLowerCase())
);

export function isProductImportFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  if (PRODUCT_IMPORT_EXTENSIONS.has(ext)) return true;
  const type = file.type.toLowerCase();
  if (type.startsWith('image/')) return true;
  if (type === 'application/pdf') return true;
  if (type === 'text/csv' || type.includes('spreadsheet')) return true;
  if (type === 'text/plain' || type === 'application/json') return true;
  if (type === 'application/zip') return true;
  return false;
}

export function filterProductImportFiles(files: File[]): File[] {
  return files.filter(isProductImportFile);
}
