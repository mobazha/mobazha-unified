/**
 * Digital Asset API service — Phase 1.0 Core MVP
 *
 * Three groups of endpoints:
 * 1. Buyer Portal — capability-based auth (orderID acts as token, no Bearer required)
 * 2. License validation — public, per-store, feature-flag gated
 * 3. Seller asset management — authenticated (Bearer token)
 *
 * Backend handlers: mobazha3.0/internal/api/huma_digital_asset_handlers.go
 *
 * NOTE: client.ts auto-unwraps `{"data": ...}` envelopes — callers receive
 * the inner payload directly.
 */

import { NODE_API } from '../../config/apiPaths';
import { authGet, authPost, authPatch, authDel, publicGet, publicPost } from './helpers';
import { getAuthHeaders, getMyGatewayUrl } from './config';
import type {
  AssetUpdateInput,
  BuyerAssetEntry,
  CreateLicenseKeyAssetRequest,
  CreateLinkAssetRequest,
  DigitalAssetInfo,
  ImportLicenseKeysRequest,
  ImportLicenseKeysResponse,
  LicenseActivateRequest,
  LicenseActivationResult,
  LicenseDeactivateRequest,
  LicenseKeyPoolStats,
  LicenseValidateRequest,
  LicenseValidationResult,
  MaskedLicenseKey,
} from '../../types/digitalAsset';

// =====================================================================
// Buyer Portal — capability-based auth (no Bearer required)
// =====================================================================

/**
 * List all digital entitlements for an order. Buyer accesses this after
 * order confirmation. URL signatures inside the response are pre-signed
 * for `urlExpirySec` seconds (default 1 hour, max 24 hours).
 */
export function getBuyerDigitalAssets(
  orderID: string,
  urlExpirySec = 3600
): Promise<BuyerAssetEntry[]> {
  const path = `${NODE_API.ORDER_DIGITAL_ASSETS(orderID)}?urlExpirySec=${urlExpirySec}`;
  return publicGet<BuyerAssetEntry[]>(path);
}

/**
 * Build the download URL for a file asset. The signed URL is included in
 * the `BuyerAssetEntry.downloadURL` field — callers typically just open
 * that URL directly. This helper exists for consumers that need the raw
 * URL without going through the asset list.
 *
 * Note: the URL must already include grant/asset/expires/v/sig query
 * params produced by the backend.
 */
export function getDigitalDownloadURL(signedURL: string): string {
  return signedURL;
}

// =====================================================================
// Public license validation (per-store, feature-flag gated)
// =====================================================================

export function validateLicense(
  storeID: string,
  req: LicenseValidateRequest
): Promise<LicenseValidationResult> {
  return publicPost<LicenseValidationResult>(NODE_API.LICENSE_VALIDATE(storeID), req);
}

export function activateLicense(
  storeID: string,
  req: LicenseActivateRequest
): Promise<LicenseActivationResult> {
  return publicPost<LicenseActivationResult>(NODE_API.LICENSE_ACTIVATE(storeID), req);
}

export function deactivateLicense(storeID: string, req: LicenseDeactivateRequest): Promise<void> {
  return publicPost<void>(NODE_API.LICENSE_DEACTIVATE(storeID), req);
}

// =====================================================================
// Seller asset management — authenticated
// =====================================================================

/**
 * Hard cap mirrored from the backend stream handler (`http.MaxBytesReader`
 * caps at 1 GiB to leave headroom for AEAD framing overhead on top of the
 * 512 MiB plaintext limit). Keep this conservative — the UI rejects upfront.
 */
export const MAX_DIGITAL_ASSET_UPLOAD_BYTES = 512 * 1024 * 1024;

/**
 * Maximum time to wait for the upload to complete, including network
 * stalls. 30 minutes covers a 512 MiB upload at ~280 KB/s (conservative
 * mobile uplink). Beyond this we assume the connection is dead and abort
 * to free the local resources — XHR with no timeout would block the
 * browser tab indefinitely on a half-open TCP connection.
 */
const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000;

export interface UploadDigitalFileStreamInput {
  listingSlug: string;
  variantSku?: string;
  fileName?: string;
  mimeType?: string;
  file: File | Blob;
}

export interface UploadDigitalFileStreamOptions {
  /** Called with bytes uploaded so far and total (when known). */
  onProgress?: (loaded: number, total: number) => void;
  /** AbortSignal to cancel the in-flight upload. */
  signal?: AbortSignal;
}

/**
 * Stream-upload a digital file to the seller node via multipart/form-data.
 *
 * Why XHR (vs. fetch)? Browser fetch still does not expose request body
 * upload progress events; XHR is the only portable way to get a progress
 * bar for hundred-MiB uploads. We deliberately keep the surface small —
 * no retries, no chunked resume — the backend's chunked AEAD container is
 * already streaming, and large uploads are bounded by the user's session.
 *
 * The backend handler is a raw chi route at
 * `POST /v1/digital-assets/upload-stream`; field order in the multipart
 * body is enforced server-side (listingSlug → variantSku → fileName →
 * mimeType → file), so we append parts in that exact order.
 */
export function uploadDigitalFileStream(
  input: UploadDigitalFileStreamInput,
  options: UploadDigitalFileStreamOptions = {}
): Promise<DigitalAssetInfo> {
  const { onProgress, signal } = options;

  return new Promise<DigitalAssetInfo>((resolve, reject) => {
    if (signal?.aborted) {
      reject(toAbortError(signal));
      return;
    }

    const fileName =
      input.fileName ?? (input.file instanceof File ? input.file.name : 'upload.bin');
    const mimeType =
      input.mimeType ??
      (input.file instanceof File && input.file.type
        ? input.file.type
        : 'application/octet-stream');

    const body = new FormData();
    body.append('listingSlug', input.listingSlug);
    body.append('variantSku', input.variantSku ?? '');
    body.append('fileName', fileName);
    body.append('mimeType', mimeType);
    // Field name `file` must come last — backend reads the multipart stream
    // sequentially and treats `file` as the streaming-only part.
    body.append('file', input.file, fileName);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${getMyGatewayUrl()}${NODE_API.DIGITAL_ASSET_UPLOAD_STREAM}`, true);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    // Forward auth header but let the browser set Content-Type so the
    // multipart boundary is generated correctly.
    const headers = getAuthHeaders();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === 'content-type') continue;
      xhr.setRequestHeader(key, value);
    }
    xhr.responseType = 'text';

    if (onProgress) {
      xhr.upload.onprogress = ev => {
        if (ev.lengthComputable) {
          onProgress(ev.loaded, ev.total);
        } else if (input.file.size > 0) {
          onProgress(ev.loaded, input.file.size);
        }
      };
    }

    let abortHandler: (() => void) | null = null;
    const cleanup = () => {
      if (abortHandler && signal) {
        signal.removeEventListener('abort', abortHandler);
      }
    };

    if (signal) {
      abortHandler = () => xhr.abort();
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    xhr.onload = () => {
      cleanup();
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(parseUploadError(xhr.responseText, xhr.status)));
        return;
      }
      try {
        const parsed = parseUploadResponse(xhr.responseText);
        resolve(parsed);
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Invalid upload response'));
      }
    };

    xhr.onerror = () => {
      cleanup();
      reject(new Error('Network error during upload'));
    };

    xhr.ontimeout = () => {
      cleanup();
      reject(new Error('Upload timed out'));
    };

    xhr.onabort = () => {
      cleanup();
      reject(toAbortError(signal));
    };

    xhr.send(body);
  });
}

function parseUploadResponse(text: string): DigitalAssetInfo {
  if (!text) {
    throw new Error('Empty response from upload');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Malformed JSON in upload response');
  }
  // Backend always wraps successful 2xx responses in `{"data": ...}` (see
  // `pkg/response.Created` in mobazha3.0). `client.ts` normally unwraps
  // this envelope for us, but XHR bypasses that pipeline so we replicate
  // the unwrap here. Reject anything that doesn't fit the contract rather
  // than silently passing the raw body through — that hid bugs in the past
  // (e.g. a backend handler returning bare JSON would type-check at compile
  // time but fail at runtime when callers tried to read `.id`).
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Unexpected upload response shape (expected JSON object)');
  }
  if (!('data' in parsed)) {
    throw new Error("Upload response missing 'data' envelope — backend contract drift?");
  }
  const data = (parsed as { data: unknown }).data;
  if (!data || typeof data !== 'object' || !('id' in data)) {
    throw new Error("Upload response 'data' missing required asset id");
  }
  return data as DigitalAssetInfo;
}

function parseUploadError(text: string, status: number): string {
  if (text) {
    try {
      const parsed = JSON.parse(text) as { error?: { message?: string } };
      if (parsed?.error?.message) return parsed.error.message;
    } catch {
      /* fall through */
    }
  }
  return `Upload failed (HTTP ${status})`;
}

function toAbortError(signal?: AbortSignal): Error {
  // DOMException is the spec-correct shape but not all environments expose
  // it as a constructor (jsdom prior to 22, RN, etc.); fall back to Error.
  const reason =
    typeof signal !== 'undefined' && signal && 'reason' in signal
      ? (signal as AbortSignal).reason
      : undefined;
  if (reason instanceof Error) return reason;
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Upload aborted', 'AbortError');
  }
  const err = new Error('Upload aborted');
  err.name = 'AbortError';
  return err;
}

export function createLinkAsset(req: CreateLinkAssetRequest): Promise<DigitalAssetInfo> {
  return authPost<DigitalAssetInfo>(NODE_API.DIGITAL_ASSET_CREATE_LINK, req);
}

export function createLicenseKeyAsset(
  req: CreateLicenseKeyAssetRequest
): Promise<DigitalAssetInfo> {
  return authPost<DigitalAssetInfo>(NODE_API.DIGITAL_ASSET_CREATE_LICENSE_KEY, req);
}

export function listAssets(listingSlug: string, variantSku?: string): Promise<DigitalAssetInfo[]> {
  const params = new URLSearchParams({ listingSlug });
  if (variantSku) params.set('variantSku', variantSku);
  return authGet<DigitalAssetInfo[]>(`${NODE_API.DIGITAL_ASSETS}?${params.toString()}`);
}

export function getAsset(assetID: string): Promise<DigitalAssetInfo> {
  return authGet<DigitalAssetInfo>(NODE_API.DIGITAL_ASSET(assetID));
}

export function updateAsset(assetID: string, updates: AssetUpdateInput): Promise<DigitalAssetInfo> {
  return authPatch<DigitalAssetInfo>(NODE_API.DIGITAL_ASSET(assetID), updates);
}

export function deleteAsset(assetID: string): Promise<void> {
  return authDel<void>(NODE_API.DIGITAL_ASSET(assetID));
}

// =====================================================================
// Seller license key management — authenticated
// =====================================================================

export function importLicenseKeys(
  req: ImportLicenseKeysRequest
): Promise<ImportLicenseKeysResponse> {
  return authPost<ImportLicenseKeysResponse>(NODE_API.DIGITAL_ASSET_LICENSE_KEYS, req);
}

export function listLicenseKeys(
  listingSlug: string,
  variantSku?: string,
  limit = 50,
  offset = 0
): Promise<MaskedLicenseKey[]> {
  const params = new URLSearchParams({
    listingSlug,
    limit: String(limit),
    offset: String(offset),
  });
  if (variantSku) params.set('variantSku', variantSku);
  return authGet<MaskedLicenseKey[]>(`${NODE_API.DIGITAL_ASSET_LICENSE_KEYS}?${params.toString()}`);
}

export function getLicenseKeyPoolStats(
  listingSlug: string,
  variantSku?: string
): Promise<LicenseKeyPoolStats> {
  const params = new URLSearchParams({ listingSlug });
  if (variantSku) params.set('variantSku', variantSku);
  return authGet<LicenseKeyPoolStats>(
    `${NODE_API.DIGITAL_ASSET_LICENSE_KEY_STATS}?${params.toString()}`
  );
}

export function revokeLicenseKey(keyID: string): Promise<void> {
  return authPost<void>(NODE_API.DIGITAL_ASSET_LICENSE_KEY_REVOKE(keyID));
}
