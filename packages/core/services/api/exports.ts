/**
 * DG-1.10 — Seller data-portability download client.
 *
 * Implements the "Your store, your data, your customers" product contract
 * from DIGITAL_DELIVERY_DESIGN.md §2.4. Each call hits the matching
 * `/v1/exports/<kind>` endpoint with `?format=csv|json` and returns the
 * raw Blob; the caller is responsible for triggering a browser download
 * via `URL.createObjectURL`.
 *
 * Routing: always uses `getGatewayUrl()` (not `getMyGatewayUrl()`) because
 * exports read node-local data. A standalone-buyer routing fallback would
 * be wrong here — only the seller has authority to export their own store.
 */

import { NODE_API } from '../../config/apiPaths';
import { getAuthHeaders, getGatewayUrl } from './config';

export type ExportKind = 'listings' | 'sales' | 'customers';
export type ExportFormat = 'csv' | 'json';

const PATH_BY_KIND: Record<ExportKind, string> = {
  listings: NODE_API.EXPORTS_LISTINGS,
  sales: NODE_API.EXPORTS_SALES,
  customers: NODE_API.EXPORTS_CUSTOMERS,
};

export interface ExportResult {
  blob: Blob;
  filename: string;
}

/**
 * Fetch an export blob and the suggested filename. The backend already
 * sets `Content-Disposition: attachment; filename="mobazha-<kind>-<date>.<ext>"`,
 * so we honour that when present and fall back to a client-side default.
 */
export async function downloadExport(
  kind: ExportKind,
  format: ExportFormat = 'csv'
): Promise<ExportResult> {
  const url = `${getGatewayUrl()}${PATH_BY_KIND[kind]}?format=${format}`;
  const resp = await fetch(url, {
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  if (!resp.ok) {
    throw new Error(`Export failed: ${resp.status} ${resp.statusText}`);
  }

  const blob = await resp.blob();
  const filename = filenameFromHeaders(resp.headers, kind, format);
  return { blob, filename };
}

/**
 * Trigger a browser download for an already-fetched export blob.
 * Centralized so the UI doesn't repeat the createObjectURL ceremony.
 */
export function triggerBlobDownload(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = result.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // revokeObjectURL on the next tick so the click handler has a chance to
  // navigate before the URL becomes invalid.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function filenameFromHeaders(headers: Headers, kind: ExportKind, format: ExportFormat): string {
  const disposition = headers.get('Content-Disposition') ?? '';
  // Match: filename="..." (handles both quoted forms used by Go's
  // backend). We avoid filename* (RFC 5987) parsing because the
  // backend produces ASCII-only filenames by design.
  const match = /filename="([^"]+)"/i.exec(disposition);
  if (match && match[1]) return match[1];
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `mobazha-${kind}-${date}.${format}`;
}
