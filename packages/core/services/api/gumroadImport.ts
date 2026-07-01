/**
 * DG-1.9 — Gumroad Import client.
 *
 * Wraps `POST /v1/listings/import/gumroad` so the UI doesn't have to
 * remember the dryRun ↔ actual-import contract. We deliberately only
 * expose two functions — `previewGumroadImport` and `runGumroadImport` —
 * even though they hit the same backend endpoint, because the call sites
 * (preview screen vs. confirm button) want explicit names rather than a
 * boolean toggle.
 *
 * Routing: always `getGatewayUrl()` — the import is a seller-only operation
 * against the seller's own node, never proxied through a buyer's view of
 * a remote store.
 */

import { NODE_API } from '../../config/apiPaths';
import { getAuthHeaders, getGatewayUrl } from './config';

export interface GumroadImportPreviewItem {
  externalId: string;
  name: string;
  /** Price in the smallest currency unit (e.g. cents) returned as a string. */
  priceMinor: string;
  currency: string;
  formattedPrice?: string;
  tags?: string[];
  thumbnailUrl?: string;
  published: boolean;
  willImport: boolean;
  skipReason?: string;
  mappedSlug?: string;
}

export interface GumroadImportedItem {
  slug: string;
  title: string;
}

export interface GumroadImportError {
  row: number;
  title: string;
  error: string;
}

export interface GumroadImportListingResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  createdItems: GumroadImportedItem[];
  updatedItems: GumroadImportedItem[];
  errors: GumroadImportError[];
}

export interface GumroadImportResponse {
  totalFetched: number;
  eligibleCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  dryRun: boolean;
  items: GumroadImportPreviewItem[];
  importResult?: GumroadImportListingResult;
  fileUploadReminder: string;
  warnings?: string[];
}

interface RawSuccess {
  data: GumroadImportResponse;
}

interface RawError {
  error?: { code?: string; message?: string };
  message?: string;
}

async function postGumroadImport(body: object): Promise<GumroadImportResponse> {
  const url = `${getGatewayUrl()}${NODE_API.LISTINGS_IMPORT_GUMROAD}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  // Try to parse JSON regardless of status — backend uses the standard
  // {data,...} / {error,...} envelope and we want the message either way.
  let parsed: unknown = null;
  try {
    parsed = await resp.json();
  } catch {
    // fall through to plain status error
  }

  if (!resp.ok) {
    const err = parsed as RawError | null;
    const msg = err?.error?.message || err?.message || `Gumroad import failed (${resp.status})`;
    throw new Error(msg);
  }

  const ok = parsed as RawSuccess;
  if (!ok || !ok.data) {
    throw new Error('Gumroad import returned an unexpected response shape');
  }
  return ok.data;
}

/**
 * Dry-run import — returns the would-be import plan without writing any
 * listings. Use this to render the preview/checklist before the user
 * confirms.
 */
export function previewGumroadImport(args: {
  accessToken: string;
  productIds?: string[];
  asDraft?: boolean;
}): Promise<GumroadImportResponse> {
  return postGumroadImport({
    accessToken: args.accessToken,
    dryRun: true,
    productIds: args.productIds,
    asDraft: args.asDraft,
  });
}

/**
 * Actually import — creates/updates draft listings on the seller's node.
 * Re-running with the same access token is idempotent (matched by stable
 * gumroad-* slug → triggers update path, not duplicate insert).
 */
export function runGumroadImport(args: {
  accessToken: string;
  productIds?: string[];
  asDraft?: boolean;
}): Promise<GumroadImportResponse> {
  return postGumroadImport({
    accessToken: args.accessToken,
    dryRun: false,
    productIds: args.productIds,
    asDraft: args.asDraft,
  });
}
